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

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

function log(...args) {
   console.log(...args);
}

export default class TopbarNotificationIcons extends Extension {
   enable() {
      log('TopbarNotificationIcons.enable()');

      this._settings = this.getSettings();

      let rightSide = this._settings.get_boolean('right-side');
      this._settings.connect('changed::right-side', () => {
         rightSide = this._settings.get_boolean('right-side');
         log('rightSide setting changed', rightSide);
         this.disable();
         this.enable();
      });

      let coloredIcons = this._settings.get_boolean('colored-icons');
      this._settings.connect('changed::colored-icons', () => {
         coloredIcons = this._settings.get_boolean('colored-icons');
         log('coloredIcons setting changed', coloredIcons);
         this.disable();
         this.enable();
      });

      this.topbarNotification = new TopbarNotification(coloredIcons);

      const dateMenu = Main.panel.statusArea.dateMenu;

      if (rightSide) {
         dateMenu.get_first_child().insert_child_above(this.topbarNotification, dateMenu._clockDisplay);
      } else {
         dateMenu.get_first_child().insert_child_below(this.topbarNotification, dateMenu._clockDisplay);
      }
   }

   disable() {
      log('TopbarNotificationIcons.disable()');
      this.topbarNotification._destroy();
      this.topbarNotification = null;
      this._settings = null;
   }
}

class NotifySource {
   constructor(source, coloredIcons) {
      this._source = source;
      this._signal = source.connect('notify::count', this._updateCount.bind(this));

      const icon = new St.Icon({
         icon_name: source._policy.id,
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
      return this._source._policy.id;
   }

   getCount() {
      const count = this._source.notifications? this._source.notifications.length : 0;
      return count.toString();
   }

   _updateCount() {
      log('onNotifyCount');
      this._label.text = this.getCount();
   }

   destroy() {
      this._source.disconnect(this._signal);
   }
}

const TopbarNotification = GObject.registerClass(
   class TopbarNotification extends St.BoxLayout {
      _init(coloredIcons) {
         super._init({
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.CENTER,
            visible: true
         });

         this.coloredIcons = coloredIcons;
         this._sources = [];

         this._signals = [
            Main.messageTray.connect('source-added', this._onSourceAdded.bind(this)),
            Main.messageTray.connect('source-removed', this._onSourceRemoved.bind(this)),
         ];

         Main.messageTray.getSources().forEach(source => this._onSourceAdded(null, source));
      }

      getSource(id) {
         return this._sources.find(s => s.id == id);
      }

      hasSource(id) {
         return !!this.getSource(id);
      }

      _onSourceAdded(tray, source) {
         log('onSourceAdded source =', source._policy);
         if (source._policy.id != 'generic') {
            if (!this.hasSource(source._policy.id)) {
               const notifySource = new NotifySource(source, this.coloredIcons);
               this._sources.push(notifySource);
               this.add_child(notifySource.widget);
            }
         }
      }

      _onSourceRemoved(tray, source) {
         log('onSourceRemoved source =', source._policy);
         const notifySource = this.getSource(source._policy.id);
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
);
