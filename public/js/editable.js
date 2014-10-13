// Generated by CoffeeScript 1.6.2
(function() {

  isIncoming = false;

  var applyChange = function(doc, oldval, newval) {
    var commonEnd, commonStart;

    if (oldval === newval) {
      return;
    }
    commonStart = 0;
    while (oldval.charAt(commonStart) === newval.charAt(commonStart)) {
      commonStart++;
    }
    commonEnd = 0;
    while (oldval.charAt(oldval.length - 1 - commonEnd) === newval.charAt(newval.length - 1 - commonEnd) && commonEnd + commonStart < oldval.length && commonEnd + commonStart < newval.length) {
      commonEnd++;
    }
    if (oldval.length !== commonStart + commonEnd) {
      doc.del(commonStart, oldval.length - commonStart - commonEnd);
    }
    if (newval.length !== commonStart + commonEnd) {
      return doc.insert(commonStart, newval.slice(commonStart, newval.length - commonEnd));
    }
  };

  function getTextFromHeadToCaret() {
    var element = document.getElementById("realEditor");
    var caretOffset = 0;
    if(elementContainsSelection(element)){
        var range = window.getSelection().getRangeAt(0);
        var preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        caretOffset = preCaretRange.toString().length;
        var divStr = $('#realEditor').text();
        return divStr.substring(0, caretOffset);
    }

    return false;
    
  }

  function elementContainsSelection(el) {
    var sel;
    if (window.getSelection) {
      sel = window.getSelection();
      if (sel.rangeCount > 0) {
        for (var i = 0; i < sel.rangeCount; ++i) {
          if (!isOrContains(sel.getRangeAt(i).commonAncestorContainer, el)) {
            return false;
          }
        }
        return true;
      }
    } else if ((sel = document.selection) && sel.type != "Control") {
      return isOrContains(sel.createRange().parentElement(), el);
    }
    return false;
  }

  function isOrContains(node, container) {
    while (node) {
      if (node === container) {
          return true;
      }
      node = node.parentNode;
    }
    return false;
  }

  function calculateOffset(textToCursor, beforeText, afterText){
    var offset = 0;

    var beforeLength = beforeText.length;
    var afterLength = afterText.length;

    // change is made after the cursor
    if(textToCursor == afterText.substring(0, textToCursor.length)){
      offset = 0;
    }
    // change is made before the cursor
    else{
      var difference = Math.abs(beforeLength - afterLength);
      if(beforeLength <= afterLength){
        offset = difference;
      }
      if(beforeLength > afterLength){
        offset = -1*difference;
      }
    }

    return offset;
  }

  function getOffset (before, after){
    compareNum = 0;

    l = Math.min(before.length, after.length);
    for( i=0; i<l; i++) {
      if( before.charAt(i) == after.charAt(i)) compareNum++;
    }

    return compareNum;
  }

  var containerElement = document.getElementById("realEditor");
  var saveS = function(){
    savedSel = rangy.getSelection().saveCharacterRanges(containerElement);
  }
  var restoreS = function(){
    rangy.getSelection().restoreCharacterRanges(containerElement, savedSel);
  }

  var replaceText = function(elem, newText, transformCursor) {
    var newSelection, scrollTop;

    newSelection = [transformCursor(elem.selectionStart), transformCursor(elem.selectionEnd)];
    scrollTop = elem.scrollTop;
    elem.value = newText;
    if (elem.scrollTop !== scrollTop) {
      elem.scrollTop = scrollTop;
    }
    if (window.document.activeElement === elem) {
      return elem.selectionStart = newSelection[0], elem.selectionEnd = newSelection[1], newSelection;
    }
  };

  function correctCursor(pos, text, isInsert, elem, transformCursor){
    isIncoming = true;

    var beforeText = $("#editor").editable("getText");
    var textToCursor = getTextFromHeadToCaret();
    saveS();

    prevvalue = elem.value.replace(/\r\n/g, '\n');
    if(isInsert){
      $("#editor").editable("setHTML", prevvalue.slice(0, pos) + text + prevvalue.slice(pos));
    }
    else{
      $("#editor").editable("setHTML", prevvalue.slice(0, pos) + prevvalue.slice(pos + text.length));      
    }

    var afterText = $("#editor").editable("getText");
    var offset = calculateOffset(textToCursor, beforeText, afterText);
    restoreS();
    rangy.getSelection().move("character", offset);

    isIncoming = false;

    if(isInsert){
      return replaceText(elem, prevvalue.slice(0, pos) + text + prevvalue.slice(pos), transformCursor);
    }
    else{
      return replaceText(elem, prevvalue.slice(0, pos) + prevvalue.slice(pos + text.length), transformCursor);
    }

  }

  window.sharejs.extendDoc('attach_editable', function(elem) {
    var delete_listener, doc, event, genOp, insert_listener, prevvalue, replaceText, _i, _len, _ref,
      _this = this;

    isIncoming = false;

    doc = this;
    elem.value = this.getText();
    prevvalue = elem.value;
    $("#editor").html(elem.value);

    rangy.init();

    // ************************************************************************************************************** //

    // ************************************************************************************************************** //
    this.on('insert', insert_listener = function(pos, text) {
      var transformCursor = function(cursor) {
        if (pos < cursor) {
          return cursor + text.length;
        } else {
          return cursor;
        }
      };

      return correctCursor(pos, text, true, elem, transformCursor);
    });
    // ************************************************************************************************************** //
    this.on('delete', delete_listener = function(pos, text) {
      var transformCursor = function(cursor) {
        if (pos < cursor) {
          return cursor - Math.min(text.length, cursor - pos);
        } else {
          return cursor;
        }
      };

      return correctCursor(pos, text, false, elem, transformCursor);
    });
    // ************************************************************************************************************** //
    genOp = function(event) {
      var onNextTick;

      onNextTick = function(fn) {
        return setTimeout(fn, 0);
      };
      return onNextTick(function() {
        if (elem.value !== prevvalue) {
          prevvalue = elem.value;
          return applyChange(doc, doc.getText(), elem.value.replace(/\r\n/g, '\n'));
        }
      });
    };
    // ************************************************************************************************************** //
    $("#editor").editable({
      inlineMode: false,
      typingTimer: 1,
      imageUpload: false,
      contentChangedCallback: function () {
        if(!isIncoming){
          var newText = $("#editor").editable("getHTML");
          elem.value = newText;
          genOp();
        }
        
      },
    });

    if(typeof isHome === 'undefined' || !isHome){
      window_size();
    }

    // ************************************************************************************************************** //
    _ref = ['textInput', 'keydown', 'keyup', 'select', 'cut', 'paste'];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      event = _ref[_i];
      if (elem.addEventListener) {
        elem.addEventListener(event, genOp, false);
      } else {
        elem.attachEvent('on' + event, genOp);
      }
    }
    // return elem.detach_share = function() {
    //   var _j, _len1, _ref1, _results;

    //   _this.removeListener('insert', insert_listener);
    //   _this.removeListener('delete', delete_listener);
    //   _ref1 = ['textInput', 'keydown', 'keyup', 'select', 'cut', 'paste'];
    //   _results = [];
    //   for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
    //     event = _ref1[_j];
    //     if (elem.removeEventListener) {
    //       _results.push(elem.removeEventListener(event, genOp, false));
    //     } else {
    //       _results.push(elem.detachEvent('on' + event, genOp));
    //     }
    //   }
    //   return _results;
    // };
  });

}).call(this);
