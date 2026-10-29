Pod::Spec.new do |s|
  s.name = 'BlooCloud'
  s.version = '1.0.0'
  s.summary = 'BlooLog iCloud backup storage'
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
