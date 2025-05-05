/* extension.js
 *
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

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

export default class TopbarNotificationIcons extends Extension {
   enable() {
      console.debug('TopbarNotificationIcons.enable()');

      const settings = this.getSettings();

      let rightSide = settings.get_boolean('right-side');
      settings.connect('changed::right-side', () => {
         rightSide = settings.get_boolean('right-side');
         this.disable();
         this.enable();
      });

      let coloredIcons = settings.get_boolean('colored-icons');
      settings.connect('changed::colored-icons', () => {
         coloredIcons = settings.get_boolean('colored-icons');
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
      console.debug('TopbarNotificationIcons.disable()');
      this.topbarNotification._destroy();
      this.topbarNotification = null;
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
      console.log('onNotifyCount');
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
         console.debug('onSourceAdded source =', source._policy);
         if (source._policy.id != 'generic') {
            if (!this.hasSource(source._policy.id)) {
               const notifySource = new NotifySource(source, this.coloredIcons);
               this._sources.push(notifySource);
               this.add_child(notifySource.widget);
            }
         }
      }

      _onSourceRemoved(tray, source) {
         console.debug('onSourceRemoved source =', source._policy);
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
