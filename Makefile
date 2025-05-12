NAME=notification-icons
DOMAIN=jiggak.io
UUID=$(NAME)@$(DOMAIN)

.PHONY: default build pack install clean

default: build

node_modules: package.json
	npm install

dist/%.js: node_modules src/%.ts
	@npx tsc

dist/schemas/gschemas.compiled: src/schemas/org.gnome.shell.extensions.$(NAME).gschema.xml
	@cp -r src/schemas dist/
	@glib-compile-schemas dist/schemas

build: dist/extension.js dist/prefs.js dist/schemas/gschemas.compiled
	@cp src/metadata.json dist/
	@cp src/stylesheet.css dist/

pack: build
	@gnome-extensions pack --force dist/

install: build
	@rm -rf ~/.local/share/gnome-shell/extensions/$(UUID)
	@cp -r dist ~/.local/share/gnome-shell/extensions/$(UUID)

clean:
	@rm -rf dist $(UUID).shell-extension.zip
