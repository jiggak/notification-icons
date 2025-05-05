UUID=notification-icons\@jiggak.github

install:
	rm -rf ~/.local/share/gnome-shell/extensions/$(UUID)
	cp -r src ~/.local/share/gnome-shell/extensions/$(UUID)

enable:
	gnome-extensions enable $(UUID)

disable:
	gnome-extensions disable $(UUID)