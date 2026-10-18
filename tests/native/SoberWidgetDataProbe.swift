import Foundation
import CoreText
import CoreGraphics

@main
struct SoberWidgetDataProbe {
  struct Fixture: Decodable {
    let snapshot: SoberWidgetSnapshot
    let dates: [Double]
    let invalid: [String]
    let fonts: [String]
  }

  static func main() throws {
    let fixture = try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1])))
    let data = try JSONEncoder().encode(fixture.snapshot)
    let snapshot = try SoberWidgetSnapshot.decode(data)
    var summaries: [[String: Any]] = []
    for record in snapshot.records {
      for date in fixture.dates {
        let summary = record.summary(at: Date(timeIntervalSince1970: date), goals: snapshot.goals)
        summaries.append([
          "id": record.id, "date": date, "elapsed": summary.elapsedText,
          "goal": summary.goalText, "progress": summary.progress,
        ])
      }
    }
    let fontNames = try fixture.fonts.map { path -> String in
      guard let provider = CGDataProvider(url: URL(fileURLWithPath: path) as CFURL),
        let font = CGFont(provider), let name = font.postScriptName else {
        throw CocoaError(.fileReadCorruptFile)
      }
      return name as String
    }
    let result: [String: Any] = [
      "summaries": summaries,
      "invalidAccepted": fixture.invalid.map { (try? SoberWidgetSnapshot.decode(Data($0.utf8))) != nil },
      "defaultId": snapshot.record(for: nil)?.id as Any,
      "deletedSelectionIsEmpty": snapshot.record(for: "99999") == nil,
      "fontNames": fontNames,
    ]
    let resultData = try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
    print(String(decoding: resultData, as: UTF8.self))
  }
}
