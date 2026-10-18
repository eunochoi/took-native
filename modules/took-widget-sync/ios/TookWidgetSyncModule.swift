import ExpoModulesCore
import WidgetKit

public final class TookWidgetSyncModule: Module {
  private let queue = DispatchQueue(label: "com.took.widget-sync")

  public func definition() -> ModuleDefinition {
    Name("TookWidgetSync")

    AsyncFunction("syncAsync") { (snapshot: String) in
      guard let data = snapshot.data(using: .utf8), data.count <= 1_000_000,
        let payload = try JSONSerialization.jsonObject(with: data) as? [String: Any],
        payload["version"] as? Int == 1,
        let records = payload["records"] as? [[String: Any]], records.count <= 10 else {
        throw Exception(name: "InvalidWidgetSnapshot", description: "Invalid widget snapshot")
      }
      guard let group = Bundle.main.object(forInfoDictionaryKey: "TookWidgetAppGroup") as? String,
        let directory = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group) else {
        throw Exception(name: "MissingWidgetAppGroup", description: "Widget App Group is unavailable")
      }
      let file = directory.appendingPathComponent("sober-widget.json")
      if (try? Data(contentsOf: file)) == data { return }
      try data.write(to: file, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
      WidgetCenter.shared.reloadTimelines(ofKind: "TookSoberWidget")
    }.runOnQueue(queue)
  }
}
