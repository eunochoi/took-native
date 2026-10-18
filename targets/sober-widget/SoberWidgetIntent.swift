import AppIntents

struct SoberWidgetEntity: AppEntity {
  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "거리두기")
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
      return SoberWidgetEntity(id: id, name: snapshot.record(for: id)?.name ?? "삭제된 거리두기")
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

enum SoberWidgetAccent: String, AppEnum {
  case blue, purple, pink, green, yellow, grey

  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "강조색")
  static var caseDisplayRepresentations: [Self: DisplayRepresentation] = [
    .blue: "파랑", .purple: "보라", .pink: "분홍", .green: "초록", .yellow: "딥 청록", .grey: "회색",
  ]
}

enum SoberWidgetBackground: String, AppEnum {
  case system, white, black

  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "배경")
  static var caseDisplayRepresentations: [Self: DisplayRepresentation] = [
    .system: "시스템", .white: "흰색", .black: "검정",
  ]
}

enum SoberWidgetTextColor: String, AppEnum {
  case automatic, black, white

  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "글자색")
  static var caseDisplayRepresentations: [Self: DisplayRepresentation] = [
    .automatic: "자동", .black: "검정", .white: "흰색",
  ]
}

struct SoberWidgetIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "거리두기 위젯"
  static var description = IntentDescription("표시할 거리두기와 위젯 모양을 선택해요.")

  @Parameter(title: "거리두기") var sober: SoberWidgetEntity?
  @Parameter(title: "강조색", default: .blue) var accent: SoberWidgetAccent
  @Parameter(title: "배경", default: .system) var background: SoberWidgetBackground
  @Parameter(title: "글자색", default: .automatic) var textColor: SoberWidgetTextColor

  static var parameterSummary: some ParameterSummary {
    Summary("\(\.$sober)") {
      \.$accent
      \.$background
      \.$textColor
    }
  }
}
