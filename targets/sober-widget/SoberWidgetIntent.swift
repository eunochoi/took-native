import AppIntents

struct SoberWidgetEntity: AppEntity {
  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Cut Back")
  static var defaultQuery = SoberWidgetEntityQuery()

  let id: String
  let name: String

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\(name)")
  }
}

struct SoberWidgetEntityQuery: EntityQuery {
  func entities(for identifiers: [String]) async throws -> [SoberWidgetEntity] {
    let snapshot = SoberWidgetSnapshot.load()
    return identifiers.compactMap { id in
      guard let number = Int(id), number > 0 else { return nil }
      return SoberWidgetEntity(id: id, name: snapshot.record(for: id)?.name ?? snapshot.resolvedLanguage.text("Deleted Cut Back item"))
    }
  }

  func suggestedEntities() async throws -> [SoberWidgetEntity] {
    SoberWidgetSnapshot.load().records.map { SoberWidgetEntity(id: String($0.id), name: $0.name) }
  }

  func defaultResult() async -> SoberWidgetEntity? {
    guard let record = SoberWidgetSnapshot.load().records.first else { return nil }
    return SoberWidgetEntity(id: String(record.id), name: record.name)
  }
}

enum SoberWidgetBackground: String, AppEnum {
  case system, white, black

  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Background")
  static var caseDisplayRepresentations: [Self: DisplayRepresentation] = [
    .system: "System", .white: "White", .black: "Black",
  ]
}

enum SoberWidgetTextColor: String, AppEnum {
  case automatic, black, white

  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Text color")
  static var caseDisplayRepresentations: [Self: DisplayRepresentation] = [
    .automatic: "Automatic", .black: "Black", .white: "White",
  ]
}

struct SoberWidgetIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "Cut Back widget"
  static var description = IntentDescription("Choose a Cut Back item and the widget appearance.")

  @Parameter(title: "Cut Back") var sober: SoberWidgetEntity?
  @Parameter(title: "Background", default: .system) var background: SoberWidgetBackground
  @Parameter(title: "Text color", default: .automatic) var textColor: SoberWidgetTextColor

  static var parameterSummary: some ParameterSummary {
    Summary("\(\.$sober)") {
      \.$background
      \.$textColor
    }
  }
}
