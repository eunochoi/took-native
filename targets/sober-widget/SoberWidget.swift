import SwiftUI
import WidgetKit

struct SoberWidgetEntry: TimelineEntry {
  let date: Date
  let configuration: SoberWidgetIntent
  let snapshot: SoberWidgetSnapshot

  var record: SoberWidgetRecord? { snapshot.record(for: configuration.sober?.id) }
}

struct SoberWidgetProvider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> SoberWidgetEntry {
    SoberWidgetEntry(
      date: .now,
      configuration: SoberWidgetIntent(),
      snapshot: SoberWidgetSnapshot(
        version: 1, goals: [3, 7, 14, 30], accents: [:],
        records: [SoberWidgetRecord(
          id: 1, name: "야식 줄이기", startedAt: Date.now.addingTimeInterval(-450000).timeIntervalSince1970,
          goalMode: "MANUAL", goalDays: 30, iconGlyph: "♥", iconFont: "TmoneyRoundWind-ExtraBold", iconKey: "food",
          iconColor: nil
        )]
      )
    )
  }

  func snapshot(for configuration: SoberWidgetIntent, in context: Context) async -> SoberWidgetEntry {
    let snapshot = SoberWidgetSnapshot.load()
    if context.isPreview && snapshot.records.isEmpty { return placeholder(in: context) }
    return SoberWidgetEntry(date: .now, configuration: configuration, snapshot: snapshot)
  }

  func timeline(for configuration: SoberWidgetIntent, in context: Context) async -> Timeline<SoberWidgetEntry> {
    let snapshot = SoberWidgetSnapshot.load()
    let now = Date.now
    // Native timelines continue from stored start times without starting the React Native app.
    let entries = (0...96).map { step in
      SoberWidgetEntry(
        date: now.addingTimeInterval(Double(step) * 900), configuration: configuration, snapshot: snapshot
      )
    }
    return Timeline(entries: entries, policy: .after(now.addingTimeInterval(86400)))
  }
}

struct SoberWidgetView: View {
  @Environment(\.colorScheme) private var colorScheme
  @Environment(\.showsWidgetContainerBackground) private var showsBackground
  let entry: SoberWidgetEntry

  private var accent: Color {
    let hex = entry.record?.resolvedIconColor(accents: entry.snapshot.accents)
      ?? entry.snapshot.accents["blue"] ?? "#8CADE2"
    let rgb = UInt32(hex.dropFirst(), radix: 16) ?? 0x8CADE2
    return Color(
      .sRGB, red: Double((rgb >> 16) & 255) / 255,
      green: Double((rgb >> 8) & 255) / 255, blue: Double(rgb & 255) / 255, opacity: 1
    )
  }

  private var background: Color {
    switch entry.configuration.background {
    case .system: Color(uiColor: .systemBackground)
    case .white: .white
    case .black: .black
    }
  }

  private var textColor: Color {
    if !showsBackground { return .primary }
    let primary = Color("WidgetTextPrimaryLight")
    switch entry.configuration.textColor {
    case .white: return .white
    case .black: return primary
    case .automatic:
      switch entry.configuration.background {
      case .white: return primary
      case .black: return .white
      case .system: return colorScheme == .dark ? .white : primary
      }
    }
  }

  var body: some View {
    Group {
      if let record = entry.record {
        let summary = record.summary(at: entry.date, goals: entry.snapshot.goals)
        VStack(spacing: 8) {
          heading(record)
          Spacer(minLength: 0)
          statistics(summary)
        }
      } else {
        VStack(spacing: 8) {
          Image(systemName: "clock.badge.checkmark")
            .font(.system(size: 30))
            .foregroundStyle(accent)
          Text("거리두기")
            .font(.custom("TmoneyRoundWind-Regular", size: 16))
          Text(entry.configuration.sober == nil
            ? "앱에서 거리두기를 만든 뒤\n위젯을 길게 눌러 선택해주세요."
            : "선택한 거리두기가 없어요.\n위젯 편집에서 다시 선택해주세요.")
            .font(.custom("TmoneyRoundWind-Regular", size: 12))
            .multilineTextAlignment(.center)
            .fixedSize(horizontal: false, vertical: true)
        }
      }
    }
    .foregroundStyle(textColor)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    // WidgetKit owns the outer shape and margins, including future system corner changes.
    .containerBackground(for: .widget) { background }
    .widgetURL(URL(string: entry.record.map { "took-local://sober/\($0.id)" } ?? "took-local://sober"))
  }

  private func heading(_ record: SoberWidgetRecord) -> some View {
    VStack(spacing: 6) {
      Image(record.iconAssetName)
        .renderingMode(.template)
        .resizable()
        .scaledToFit()
        .foregroundStyle(accent)
        .frame(width: 24, height: 24)
        .frame(width: 36, height: 36)
        .widgetAccentable()
        .accessibilityHidden(true)
      Text(record.name)
        .font(.custom("TmoneyRoundWind-Regular", size: 16))
        .lineLimit(1)
        .minimumScaleFactor(0.65)
    }
  }

  private func statistics(_ summary: SoberWidgetSummary) -> some View {
    VStack(spacing: 6) {
      Text(summary.elapsedText)
        .font(.custom("TmoneyRoundWind-ExtraBold", size: 16))
        .lineLimit(1)
        .minimumScaleFactor(0.5)
        .monospacedDigit()
      GeometryReader { geometry in
        ZStack(alignment: .leading) {
          Capsule().fill(textColor.opacity(0.12))
          Capsule().fill(accent)
            .frame(width: geometry.size.width * summary.progress / 100)
            .widgetAccentable()
        }
      }
      .frame(height: 8)
      .accessibilityLabel("진행률")
      .accessibilityValue("\(summary.progress, specifier: "%.1f")퍼센트")
      HStack(spacing: 4) {
        Text("목표 \(summary.goalText)")
        Spacer(minLength: 0)
        Text("\(summary.progress, specifier: "%.1f")%")
      }
      .font(.custom("TmoneyRoundWind-Regular", size: 11))
      .lineLimit(1)
      .minimumScaleFactor(0.7)
    }
  }
}

struct TookSoberWidget: Widget {
  let kind = "TookSoberWidget"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: SoberWidgetIntent.self, provider: SoberWidgetProvider()) { entry in
      SoberWidgetView(entry: entry)
    }
    .configurationDisplayName("포포툭 거리두기")
    .description("선택한 거리두기의 경과 시간과 목표를 확인해요.")
    .supportedFamilies([.systemSmall])
  }
}

@main
struct TookWidgetBundle: WidgetBundle {
  var body: some Widget { TookSoberWidget() }
}
