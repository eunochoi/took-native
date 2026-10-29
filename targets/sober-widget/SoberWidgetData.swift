import Foundation

struct SoberWidgetRecord: Codable {
  let id: Int
  let name: String
  let startedAt: Double
  let goalMode: String
  let goalDays: Int?
  let iconGlyph: String
  let iconFont: String
  let iconKey: String?
  let iconColor: String?

  func resolvedIconColor(accents: [String: String]) -> String {
    if let iconColor, iconColor.range(of: "^#[0-9A-Fa-f]{6}$", options: .regularExpression) != nil {
      return iconColor
    }
    return accents["blue"] ?? "#8CADE2"
  }

  var iconAssetName: String {
    SoberWidgetIcons.assetName(key: iconKey, glyph: iconGlyph, font: iconFont)
  }

  func summary(at date: Date, goals: [Int], language: SoberWidgetLanguage = .ko) -> SoberWidgetSummary {
    let duration = max(0, date.timeIntervalSince1970 - startedAt)
    let days = goalMode == "AUTO"
      ? goals.first(where: { duration < Double($0) * 86400 }) ?? goals.last ?? 1095
      : goalDays ?? 1
    return SoberWidgetSummary(duration: duration, goalDays: days, language: language)
  }
}

struct SoberWidgetSummary {
  let duration: TimeInterval
  let goalDays: Int
  var language: SoberWidgetLanguage = .ko

  var progress: Double {
    min(100, max(0, duration / (Double(goalDays) * 86400) * 100))
  }

  var elapsedText: String {
    let minutes = Int(max(0, floor(duration / 60)))
    let days = minutes / 1440
    let hours = (minutes % 1440) / 60
    return language.text("%ldd %ldh %ldm", days, hours, minutes % 60)
  }

  var goalText: String {
    let labels = [14: "2 weeks", 30: "1 month", 90: "3 months", 180: "6 months", 365: "1 year", 730: "2 years", 1095: "3 years"]
    if let label = labels[goalDays] { return language.text(label) }
    return language.text(goalDays == 1 ? "%ld day" : "%ld days", goalDays)
  }
}

struct SoberWidgetSnapshot: Codable {
  let version: Int
  let goals: [Int]
  let accents: [String: String]
  let records: [SoberWidgetRecord]
  let language: String?

  init(version: Int, goals: [Int], accents: [String: String], records: [SoberWidgetRecord], language: String? = nil) {
    self.version = version
    self.goals = goals
    self.accents = accents
    self.records = records
    self.language = language
  }

  var resolvedLanguage: SoberWidgetLanguage { SoberWidgetLanguage.resolve(language) }

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
