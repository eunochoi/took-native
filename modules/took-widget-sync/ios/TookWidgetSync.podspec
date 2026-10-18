Pod::Spec.new do |s|
  s.name = 'TookWidgetSync'
  s.version = '1.0.0'
  s.summary = 'Share TOOK sober widget snapshots with WidgetKit.'
  s.description = s.summary
  s.license = { :type => 'MIT' }
  s.author = 'TOOK'
  s.homepage = 'https://to-ok.me'
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.source = { :path => '.' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'WidgetKit'
  s.source_files = '**/*.swift'
end
