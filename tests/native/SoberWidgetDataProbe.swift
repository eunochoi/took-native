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
    let iconSnapshots: [String]
    let colorSnapshots: [String]
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
    var englishSummaries: [[String: Any]] = []
    for record in snapshot.records {
      for date in fixture.dates {
        let summary = record.summary(at: Date(timeIntervalSince1970: date), goals: snapshot.goals, language: .en)
        englishSummaries.append([
          "id": record.id, "date": date, "elapsed": summary.elapsedText,
          "goal": summary.goalText, "progress": summary.progress,
        ])
      }
    }
    struct LegacySnapshot: Decodable {
      let version: Int
      let goals: [Int]
      let accents: [String: String]
      let records: [SoberWidgetRecord]
    }
    let oldDecoder = try JSONDecoder().decode(LegacySnapshot.self, from: data)
    var legacyJSON = try JSONSerialization.jsonObject(with: data) as! [String: Any]
    legacyJSON.removeValue(forKey: "language")
    legacyJSON.removeValue(forKey: "systemLanguage")
    let legacy = try SoberWidgetSnapshot.decode(JSONSerialization.data(withJSONObject: legacyJSON))
    let languageCases: [(String?, String)] = [
      (nil, "ko_KR"), (nil, "en_GB"), ("system", "ko-KR"), ("system", "ja_JP"),
      ("system", "fr_FR"), ("ko", "en_US"), ("en", "ko_KR"), ("ja", "ko_KR"),
    ]
    let nonKoreanLocales = ["zh_Hans_CN", "zh_Hant_TW", "ar_SA", "he_IL", "hi_IN", "th_TH", "ru_RU", "es_MX", "pt_BR", "vi_VN", "id_ID", "tr_TR", "kok_IN"]
    for tag in nonKoreanLocales {
      precondition(SoberWidgetLanguage.resolve("system", locale: Locale(identifier: tag)) == .en, tag)
      precondition(SoberWidgetLanguage.resolve("ko", locale: Locale(identifier: tag)) == .ko, tag)
    }
    let languageResults = languageCases.map { SoberWidgetLanguage.resolve($0.0, locale: Locale(identifier: $0.1)).rawValue }
    let goalDays = [1, 2, 14, 30, 90, 180, 365, 730, 1095, 1234]
    let goalLabels = ["ko", "en"].map { code in
      goalDays.map { SoberWidgetSummary(duration: 0, goalDays: $0, language: SoberWidgetLanguage(rawValue: code)!).goalText }
    }
    let labels = ["ko", "en"].map { code -> [String] in
      let language = SoberWidgetLanguage(rawValue: code)!
      return [language.text("Cut Back Timer"), language.text("Progress"), language.text("%.1f percent", 33.3), language.text("%.1f%%", 33.3), language.text("Goal %@", "test")]
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
      "englishSummaries": englishSummaries,
      "oldDecoderAccepted": oldDecoder.version == 1 && oldDecoder.records.count == snapshot.records.count,
      "legacyLanguageMissing": legacy.language == nil && legacy.records.count == snapshot.records.count,
      "languageResults": languageResults,
      "goalLabels": goalLabels,
      "labels": labels,
      "invalidAccepted": fixture.invalid.map { (try? SoberWidgetSnapshot.decode(Data($0.utf8))) != nil },
      "defaultId": snapshot.record(for: nil)?.id as Any,
      "deletedSelectionIsEmpty": snapshot.record(for: "99999") == nil,
      "fontNames": fontNames,
      "assetNames": try fixture.iconSnapshots.map {
        try SoberWidgetSnapshot.decode(Data($0.utf8)).records[0].iconAssetName
      },
      "iconColors": try fixture.colorSnapshots.map {
        let current = try SoberWidgetSnapshot.decode(Data($0.utf8))
        return current.records[0].resolvedIconColor(accents: current.accents)
      },
    ]
    let resultData = try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
    print(String(decoding: resultData, as: UTF8.self))
  }
}
