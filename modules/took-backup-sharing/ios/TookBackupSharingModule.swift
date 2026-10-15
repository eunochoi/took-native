import ExpoModulesCore
import UIKit

public final class TookBackupSharingModule: Module {
  private var sharing = false

  public func definition() -> ModuleDefinition {
    Name("TookBackupSharing")

    AsyncFunction("shareAsync") { (urls: [URL], promise: Promise) in
      guard !self.sharing, (2...20000).contains(urls.count) else {
        throw Exception(name: "InvalidBackupShare", description: "Select a complete backup set when no share is open")
      }
      let cache = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        .resolvingSymlinksInPath().path + "/"
      for url in urls {
        let file = url.resolvingSymlinksInPath()
        guard url.isFileURL, file.path.hasPrefix(cache),
          file.lastPathComponent.range(of: "^took-backup-[a-zA-Z0-9-]+\\.zip$", options: .regularExpression) != nil,
          FileManager.default.isReadableFile(atPath: file.path),
          FileSystemUtilities.isReadableFile(self.appContext, file) else {
          throw Exception(name: "InvalidBackupFile", description: "Only TOOK cache backups can be shared")
        }
      }
      guard let presenter = self.appContext?.utilities?.currentViewController(),
        presenter.presentedViewController == nil else {
        throw Exception(name: "MissingSharePresenter", description: "Cannot open backup sharing right now")
      }
      let controller = UIActivityViewController(activityItems: urls, applicationActivities: nil)
      controller.title = "전체 took 백업 공유"
      controller.popoverPresentationController?.sourceView = presenter.view
      controller.popoverPresentationController?.sourceRect = CGRect(
        x: presenter.view.bounds.midX, y: presenter.view.bounds.maxY, width: 0, height: 0
      )
      controller.completionWithItemsHandler = { _, _, _, error in
        self.sharing = false
        if let error {
          promise.reject(error)
        } else {
          promise.resolve(nil)
        }
      }
      self.sharing = true
      presenter.present(controller, animated: true)
    }.runOnQueue(.main)
  }
}
