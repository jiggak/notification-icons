/*
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { Source } from '@girs/gnome-shell/ui/messageTray';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import St from 'gi://St';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { MessageTray, NotificationApplicationPolicy } from 'resource:///org/gnome/shell/ui/messageTray.js';

function log(...args: any[]) {
   console.log(...args);
}

export default class TopbarNotificationIcons extends Extension {
   _settings?: Gio.Settings;
   _topbarNotification?: TopbarNotification;

   enable() {
      log('TopbarNotificationIcons.enable()');

      this._settings = this.getSettings();

      const rightSide = this._settings.get_boolean('right-side');
      const coloredIcons = this._settings.get_boolean('colored-icons');

      const onSettingChanged = (_: Gio.Settings, key: string) => {
         log('setting changed:', key);
         this.disable();
         this.enable();
      }

      this._settings.connect('changed::right-side', onSettingChanged);
      this._settings.connect('changed::colored-icons', onSettingChanged);

      this._topbarNotification = new TopbarNotification(coloredIcons);

      const dateMenu = Main.panel.statusArea.dateMenu;
      const clockDisplay: Clutter.Actor = (dateMenu as any)._clockDisplay;

      if (rightSide) {
         dateMenu.get_first_child()?.insert_child_above(this._topbarNotification, clockDisplay);
      } else {
         dateMenu.get_first_child()?.insert_child_below(this._topbarNotification, clockDisplay);
      }
   }

   disable() {
      log('TopbarNotificationIcons.disable()');
      this._topbarNotification?._destroy();
      this._topbarNotification = undefined;
      this._settings = undefined;
   }
}

function getPolicyId(source: Source) {
   if (source.policy instanceof NotificationApplicationPolicy) {
      return source.policy.id;
   }

   return null;
}

class NotifySource {
   private _source: Source;
   private _signal: number;
   private _label: St.Label;
   readonly widget: St.Widget;

   constructor(source: Source, coloredIcons: boolean) {
      this._source = source;
      this._signal = source.connect('notify::count', () => this._updateCount());

      const icon = new St.Icon({
         icon_name: getPolicyId(source)!,
         icon_size: 18,
         style_class: 'topbar-notification-icon',
      });

      if (!coloredIcons) {
         icon.add_style_class_name('app-menu-icon');
         icon.add_effect(new Clutter.DesaturateEffect());
      }

      this._label = new St.Label({
         style_class: 'notification-count',
         text: this.getCount()
      });

      this.widget = new St.Widget({
         layout_manager: new Clutter.BinLayout()
      });
      this.widget.add_child(icon);
      this.widget.add_child(this._label);
   }

   get id() {
      return getPolicyId(this._source);
   }

   getCount() {
      const count = this._source.notifications? this._source.notifications.length : 0;
      return count.toString();
   }

   private _updateCount() {
      log('onNotifyCount');
      this._label.text = this.getCount();
   }

   destroy() {
      this._source.disconnect(this._signal);
   }
}

class TopbarNotification extends St.BoxLayout {
   private _sources: NotifySource[];
   private _signals: number[];

   constructor(public coloredIcons: boolean) {
      super({
         y_align: Clutter.ActorAlign.CENTER,
         x_align: Clutter.ActorAlign.CENTER,
         visible: true
      });

      this._sources = [];

      this._signals = [
         Main.messageTray.connect('source-added', (tray, source) => this._onSourceAdded(tray, source)),
         Main.messageTray.connect('source-removed', this._onSourceRemoved.bind(this)),
      ];

      Main.messageTray.getSources().forEach(source => this._onSourceAdded(null, source));
   }

   getSource(source: Source) {
      const id = getPolicyId(source);
      if (id) {
         return this._sources.find(s => s.id == id);
      }
   }

   hasSource(source: Source) {
      return this.getSource(source) !== undefined;
   }

   _onSourceAdded(tray: MessageTray | null, source: Source) {
      log('onSourceAdded source =', source.policy);
      if (getPolicyId(source) && !this.hasSource(source)) {
         const notifySource = new NotifySource(source, this.coloredIcons);
         this._sources.push(notifySource);
         this.add_child(notifySource.widget);
      }
   }

   _onSourceRemoved(tray: MessageTray, source: Source) {
      log('onSourceRemoved source =', source.policy);
      const notifySource = this.getSource(source);
      if (notifySource) {
         this.remove_child(notifySource.widget);
         notifySource.destroy();
         this._sources.splice(this._sources.indexOf(notifySource), 1);
      }
   }

   _destroy() {
      this._signals.forEach(signal => Main.messageTray.disconnect(signal));
      this.destroy();
   }
}

GObject.registerClass(TopbarNotification);
