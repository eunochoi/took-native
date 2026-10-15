Pod::Spec.new do |s|
  s.name = 'TookBackupSharing'
  s.version = '1.0.0'
  s.summary = 'Share a complete TOOK backup set.'
  s.description = s.summary
  s.license = { :type => 'MIT' }
  s.author = 'TOOK'
  s.homepage = 'https://to-ok.me'
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.source = { :path => '.' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
end
