/**
 * Plugin.js
 *
 * Released under LGPL License.
 * Copyright (c) 1999-2017 Ephox Corp. All rights reserved
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

import PluginManager from 'tinymce/core/PluginManager';
import Convert from './core/Convert';

PluginManager.add('bbcode', function () {
  return {
    init: function (editor) {
      editor.on('beforeSetContent', function (e) {
        e.content = Convert.bbcode2html(e.content);
      });

      editor.on('postProcess', function (e) {
        if (e.set) {
          e.content = Convert.bbcode2html(e.content);
        }

        if (e.get) {
          e.content = Convert.html2bbcode(e.content);
        }
      });
    }
  };
});

export default function () { };