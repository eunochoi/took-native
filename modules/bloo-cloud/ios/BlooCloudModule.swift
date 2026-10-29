import CommonCrypto
import CryptoKit
import ExpoModulesCore
import Foundation

public final class BlooCloudModule: Module {
  private let manager = FileManager.default
  private func location() throws -> (URL, String) {
    guard let token = manager.ubiquityIdentityToken,
      let root = manager.url(forUbiquityContainerIdentifier: "iCloud.com.took")
    else {
      throw Exception(name: "BlooCloudUnavailable", description: "BLOO_ICLOUD_UNAVAILABLE")
    }
    let identity = try NSKeyedArchiver.archivedData(
      withRootObject: token, requiringSecureCoding: false)
    let fingerprint = SHA256.hash(data: identity).map { String(format: "%02x", $0) }.joined()
    let directory = root.appendingPathComponent("Documents/bloolog", isDirectory: true)
    try manager.createDirectory(at: directory, withIntermediateDirectories: true)
    return (directory, fingerprint)
  }
  private func file(_ name: String, _ identity: String) throws -> URL {
    let (directory, current) = try location()
    guard current == identity else {
      throw Exception(name: "BlooCloudAccountChanged", description: "BLOO_ICLOUD_ACCOUNT_CHANGED")
    }
    guard
      name.range(
        of: "^bloolog-[a-f0-9]{16}-[0-9-]{10}-[0-9]+-[a-f0-9]{16}\\.bloo$",
        options: .regularExpression) != nil
    else {
      throw Exception(name: "BlooCloudName", description: "BLOO_INVALID")
    }
    return directory.appendingPathComponent(name)
  }
  public func definition() -> ModuleDefinition {
    Name("BlooCloud")
    AsyncFunction("deriveKey") { (password: String, saltHex: String) -> String in
      guard saltHex.range(of: "^[a-f0-9]{32}$", options: .regularExpression) != nil,
        password.utf8.count <= 1024
      else {
        throw Exception(name: "BlooPassword", description: "BLOO_INVALID")
      }
      let characters = Array(saltHex)
      let salt = stride(from: 0, to: characters.count, by: 2).map {
        UInt8(String(characters[$0...($0 + 1)]), radix: 16)!
      }
      var passwordBytes = Array(password.utf8)
      var key = [UInt8](repeating: 0, count: 32)
      defer {
        _ = passwordBytes.withUnsafeMutableBytes {
          $0.initializeMemory(as: UInt8.self, repeating: 0)
        }
        _ = key.withUnsafeMutableBytes { $0.initializeMemory(as: UInt8.self, repeating: 0) }
      }
      let result = passwordBytes.withUnsafeBytes { pass in
        salt.withUnsafeBytes { saltBuffer in
          key.withUnsafeMutableBytes { output in
            CCKeyDerivationPBKDF(
              CCPBKDFAlgorithm(kCCPBKDF2), pass.bindMemory(to: Int8.self).baseAddress,
              passwordBytes.count, saltBuffer.bindMemory(to: UInt8.self).baseAddress, salt.count,
              CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256), 600_000,
              output.bindMemory(to: UInt8.self).baseAddress, 32)
          }
        }
      }
      guard result == kCCSuccess else {
        throw Exception(name: "BlooKey", description: "BLOO_INVALID")
      }
      return key.map { String(format: "%02x", $0) }.joined()
    }
    AsyncFunction("location") { () -> [String: String] in
      let (directory, identity) = try self.location()
      return ["uri": directory.absoluteString, "identity": identity]
    }
    AsyncFunction("publish") { (source: URL, name: String, identity: String) in
      let cache =
        self.manager.urls(for: .cachesDirectory, in: .userDomainMask)[0].resolvingSymlinksInPath()
        .path + "/"
      guard source.isFileURL, source.resolvingSymlinksInPath().path.hasPrefix(cache),
        source.pathExtension == "bloo"
      else {
        throw Exception(name: "BlooCloudSource", description: "BLOO_INVALID")
      }
      let destination = try self.file(name, identity)
      let temporary = destination.deletingLastPathComponent().appendingPathComponent(
        ".pending-\(UUID().uuidString)")
      defer { try? self.manager.removeItem(at: temporary) }
      try self.manager.copyItem(at: source, to: temporary)
      var coordinatorError: NSError?
      var operationError: Error?
      NSFileCoordinator().coordinate(
        writingItemAt: destination, options: .forReplacing, error: &coordinatorError
      ) { url in
        do { try self.manager.moveItem(at: temporary, to: url) } catch { operationError = error }
      }
      if let error = coordinatorError { throw error }
      if let error = operationError { throw error }
    }
    AsyncFunction("uploaded") { (name: String, identity: String) -> Bool in
      let url = try self.file(name, identity)
      let values = try url.resourceValues(forKeys: [
        .ubiquitousItemIsUploadedKey, .ubiquitousItemUploadingErrorKey,
      ])
      if let error = values.ubiquitousItemUploadingError { throw error }
      return values.ubiquitousItemIsUploaded == true
    }
    AsyncFunction("names") { (identity: String) -> [String] in
      let (directory, current) = try self.location()
      guard current == identity else {
        throw Exception(name: "BlooCloudAccountChanged", description: "BLOO_ICLOUD_ACCOUNT_CHANGED")
      }
      return try self.manager.contentsOfDirectory(atPath: directory.path).map { name in
        // Evicted ubiquitous documents may be represented by .name.icloud placeholders.
        if name.hasPrefix("."), name.hasSuffix(".icloud") {
          return String(name.dropFirst().dropLast(7))
        }
        return name
      }
    }
    AsyncFunction("remove") { (name: String, identity: String) in
      let url = try self.file(name, identity)
      var coordinatorError: NSError?
      var operationError: Error?
      NSFileCoordinator().coordinate(
        writingItemAt: url, options: .forDeleting, error: &coordinatorError
      ) { target in
        do { try self.manager.removeItem(at: target) } catch { operationError = error }
      }
      if let error = coordinatorError { throw error }
      if let error = operationError { throw error }
    }
  }
}
