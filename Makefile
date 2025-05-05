UUID=notification-icons\@jiggak.github

install:
	cp -r src ~/.local/share/gnome-shell/extensions/$(UUID)

enable:
	gnome-extensions enable $(UUID)

disable:
	gnome-extensions disable $(UUID)