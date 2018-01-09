/**
 * Dialog.js
 *
 * Released under LGPL License.
 * Copyright (c) 1999-2017 Ephox Corp. All rights reserved
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

import Env from 'tinymce/core/Env';
import Tools from 'tinymce/core/util/Tools';
import Settings from '../api/Settings';
import HtmlToData from '../core/HtmlToData';
import Service from '../core/Service';
import Size from '../core/Size';
import UpdateHtml from '../core/UpdateHtml';
import SizeManager from './SizeManager';

var embedChange = (Env.ie && Env.ie <= 8) ? 'onChange' : 'onInput';

var handleError = function (editor) {
  return function (error) {
    var errorMessage = error && error.msg ?
      'Media embed handler error: ' + error.msg :
      'Media embed handler threw unknown error.';
    editor.notificationManager.open({ type: 'error', text: errorMessage });
  };
};

var getData = function (editor) {
  var element = editor.selection.getNode();
  var dataEmbed = element.getAttribute('data-ephox-embed-iri');

  if (dataEmbed) {
    return {
      source1: dataEmbed,
      'data-ephox-embed-iri': dataEmbed,
      width: Size.getMaxWidth(element),
      height: Size.getMaxHeight(element)
    };
  }

  return element.getAttribute('data-mce-object') ?
    HtmlToData.htmlToData(Settings.getScripts(editor), editor.serializer.serialize(element, { selection: true })) :
    {};
};

var getSource = function (editor) {
  var elm = editor.selection.getNode();

  if (elm.getAttribute('data-mce-object') || elm.getAttribute('data-ephox-embed-iri')) {
    return editor.selection.getContent();
  }
};

var addEmbedHtml = function (win, editor) {
  return function (response) {
    var html = response.html;
    var embed = win.find('#embed')[0];
    var data = Tools.extend(HtmlToData.htmlToData(Settings.getScripts(editor), html), { source1: response.url });
    win.fromJSON(data);

    if (embed) {
      embed.value(html);
      SizeManager.updateSize(win);
    }
  };
};

var selectPlaceholder = function (editor, beforeObjects) {
  var i;
  var y;
  var afterObjects = editor.dom.select('img[data-mce-object]');

  // Find new image placeholder so we can select it
  for (i = 0; i < beforeObjects.length; i++) {
    for (y = afterObjects.length - 1; y >= 0; y--) {
      if (beforeObjects[i] === afterObjects[y]) {
        afterObjects.splice(y, 1);
      }
    }
  }

  editor.selection.select(afterObjects[0]);
};

var handleInsert = function (editor, html) {
  var beforeObjects = editor.dom.select('img[data-mce-object]');

  editor.insertContent(html);
  selectPlaceholder(editor, beforeObjects);
  editor.nodeChanged();
};

var submitForm = function (win, editor) {
  var data = win.toJSON();

  data.embed = UpdateHtml.updateHtml(data.embed, data);

  if (data.embed && Service.isCached(data.source1)) {
    handleInsert(editor, data.embed);
  } else {
    Service.getEmbedHtml(editor, data)
      .then(function (response) {
        handleInsert(editor, response.html);
      })["catch"](handleError(editor));
  }
};

var populateMeta = function (win, meta) {
  Tools.each(meta, function (value, key) {
    win.find('#' + key).value(value);
  });
};

var showDialog = function (editor) {
  var win;
  var data;

  var generalFormItems: any[] = [
    {
      name: 'source1',
      type: 'filepicker',
      filetype: 'media',
      size: 40,
      autofocus: true,
      label: 'Source',
      onpaste: function () {
        setTimeout(function () {
          Service.getEmbedHtml(editor, win.toJSON())
            .then(
            addEmbedHtml(win, editor)
            )["catch"](handleError(editor));
        }, 1);
      },
      onchange: function (e) {
        Service.getEmbedHtml(editor, win.toJSON())
          .then(
          addEmbedHtml(win, editor)
          )["catch"](handleError(editor));

        populateMeta(win, e.meta);
      },
      onbeforecall: function (e) {
        e.meta = win.toJSON();
      }
    }
  ];

  var advancedFormItems = [];

  var reserialise = function (update) {
    update(win);
    data = win.toJSON();
    win.find('#embed').value(UpdateHtml.updateHtml(data.embed, data));
  };

  if (Settings.hasAltSource(editor)) {
    advancedFormItems.push({ name: 'source2', type: 'filepicker', filetype: 'media', size: 40, label: 'Alternative source' });
  }

  if (Settings.hasPoster(editor)) {
    advancedFormItems.push({ name: 'poster', type: 'filepicker', filetype: 'image', size: 40, label: 'Poster' });
  }

  if (Settings.hasDimensions(editor)) {
    var control = SizeManager.createUi(reserialise);
    generalFormItems.push(control);
  }

  data = getData(editor);

  var embedTextBox = {
    id: 'mcemediasource',
    type: 'textbox',
    flex: 1,
    name: 'embed',
    value: getSource(editor),
    multiline: true,
    rows: 5,
    label: 'Source'
  };

  var updateValueOnChange = function () {
    data = Tools.extend({}, HtmlToData.htmlToData(Settings.getScripts(editor), this.value()));
    this.parent().parent().fromJSON(data);
  };

  embedTextBox[embedChange] = updateValueOnChange;

  win = editor.windowManager.open({
    title: 'Insert/edit media',
    data: data,
    bodyType: 'tabpanel',
    body: [
      {
        title: 'General',
        type: "form",
        items: generalFormItems
      },

      {
        title: 'Embed',
        type: "container",
        layout: 'flex',
        direction: 'column',
        align: 'stretch',
        padding: 10,
        spacing: 10,
        items: [
          {
            type: 'label',
            text: 'Paste your embed code below:',
            forId: 'mcemediasource'
          },
          embedTextBox
        ]
      },

      {
        title: 'Advanced',
        type: "form",
        items: advancedFormItems
      }
    ],
    onSubmit: function () {
      SizeManager.updateSize(win);
      submitForm(win, editor);
    }
  });

  SizeManager.syncSize(win);
};

export default {
  showDialog: showDialog
};