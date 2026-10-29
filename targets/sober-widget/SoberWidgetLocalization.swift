import Foundation

enum SoberWidgetLanguage: String {
  case en, ko

  static func resolve(_ preference: String?, locale: Locale = .autoupdatingCurrent) -> Self {
    if let preference, let explicit = Self(rawValue: preference) { return explicit }
    if preference == nil || preference == "system" {
      let code = locale.identifier.replacingOccurrences(of: "_", with: "-").split(separator: "-").first?.lowercased()
      return code == "ko" ? .ko : .en
    }
    return .en
  }

  func text(_ key: String, _ arguments: CVarArg...) -> String {
    let bundle = Bundle.main.path(forResource: rawValue, ofType: "lproj")
      .flatMap { Bundle(path: $0) } ?? .main
    let format = NSLocalizedString(key, bundle: bundle, value: key, comment: "")
    return String(format: format, arguments: arguments)
  }
}
