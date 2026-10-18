import Foundation

struct SoberWidgetRecord: Codable {
  let id: Int
  let name: String
  let startedAt: Double
  let goalMode: String
  let goalDays: Int?
  let iconGlyph: String
  let iconFont: String

  func summary(at date: Date, goals: [Int]) -> SoberWidgetSummary {
    let duration = max(0, date.timeIntervalSince1970 - startedAt)
    let days = goalMode == "AUTO"
      ? goals.first(where: { duration < Double($0) * 86400 }) ?? goals.last ?? 1095
      : goalDays ?? 1
    return SoberWidgetSummary(duration: duration, goalDays: days)
  }
}

struct SoberWidgetSummary {
  let duration: TimeInterval
  let goalDays: Int

  var progress: Double {
    min(100, max(0, duration / (Double(goalDays) * 86400) * 100))
  }

  var elapsedText: String {
    let minutes = Int(max(0, floor(duration / 60)))
    let days = minutes / 1440
    let hours = (minutes % 1440) / 60
    if days >= 365 {
      let remaining = days % 365
      return "\(days / 365)년 \(remaining > 0 ? "\(remaining)일 " : "")\(hours)시간"
    }
    return "\(days)일 \(hours)시간 \(minutes % 60)분"
  }

  var goalText: String {
    let labels = [14: "2주", 30: "1개월", 90: "3개월", 180: "6개월", 365: "1년", 730: "2년", 1095: "3년"]
    return labels[goalDays] ?? "\(goalDays)일"
  }
}

struct SoberWidgetSnapshot: Codable {
  let version: Int
  let goals: [Int]
  let accents: [String: String]
  let records: [SoberWidgetRecord]

  static let empty = SoberWidgetSnapshot(version: 1, goals: [], accents: [:], records: [])

  static func decode(_ data: Data) throws -> SoberWidgetSnapshot {
    let snapshot = try JSONDecoder().decode(Self.self, from: data)
    guard snapshot.version == 1, snapshot.records.count <= 10,
      !snapshot.goals.isEmpty, snapshot.goals.allSatisfy({ $0 > 0 }),
      snapshot.goals == snapshot.goals.sorted(),
      Set(snapshot.records.map(\.id)).count == snapshot.records.count,
      snapshot.records.allSatisfy({
        $0.id > 0 && !$0.name.isEmpty && $0.startedAt.isFinite && $0.startedAt >= 0 &&
        ($0.goalMode == "AUTO" || ($0.goalMode == "MANUAL" && ($0.goalDays ?? 0) > 0))
      }) else {
      throw CocoaError(.coderReadCorrupt)
    }
    return snapshot
  }

  static func load() -> SoberWidgetSnapshot {
    guard let group = Bundle.main.object(forInfoDictionaryKey: "TookWidgetAppGroup") as? String,
      let directory = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group),
      let data = try? Data(contentsOf: directory.appendingPathComponent("sober-widget.json")),
      let snapshot = try? decode(data) else { return .empty }
    return snapshot
  }

  func record(for identifier: String?) -> SoberWidgetRecord? {
    guard let identifier else { return records.first }
    // A deleted selection stays empty instead of silently switching to a different record.
    return records.first(where: { String($0.id) == identifier })
  }
}
