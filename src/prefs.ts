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

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';

import {
   ExtensionPreferences,
   gettext as _,
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class NotificationIconsPrefs extends ExtensionPreferences {
   _settings?: Gio.Settings;

   fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void> {
      const page = new Adw.PreferencesPage({
         title: _('General'),
         icon_name: 'dialog-information-symbolic',
      });
      window.add(page);

      const group = new Adw.PreferencesGroup({
         title: _('Configuration'),
         description: _('Configure the extension'),
      });
      page.add(group);

      const row = new Adw.SwitchRow({
         title: _('Right Side'),
         subtitle: _('Whether to show icons on the right side'),
      });
      group.add(row);

      const row2 = new Adw.SwitchRow({
         title: _('Colored Icons'),
         subtitle: _('Toggles between symbolic and colored icons'),
      });
      group.add(row2);

      this._settings = this.getSettings();
      this._settings.bind(
         'right-side',
         row,
         'active',
         Gio.SettingsBindFlags.DEFAULT
      );
      this._settings.bind(
         'colored-icons',
         row2,
         'active',
         Gio.SettingsBindFlags.DEFAULT
      );

      return Promise.resolve();
   }
}
