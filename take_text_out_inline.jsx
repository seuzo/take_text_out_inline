/*
    take_text_out_inline.jsx
    (c)2013 seuzo.jp
    インラインテキストをフレームの外に追い出して指定のタグで囲む。
    インライングラフィックはファイル名をタグで囲む。
    
    検索対象はドキュメントのみ。グループ化されたものは処理しない。
    
    
    2013-09-07  とりあえず。InDesign CS5で動作
    2013-09-09  オーバーフローしているテキストフレームにも対応。タグ名を指定しない（空文字列）なら、タグづけしないようにした。
    2013-09-09  インライングラフィックの場合、ファイル名を挿入するようにした。
    2013-09-18  範囲を扱えるようにした
    
    ToDo:
    グループ化されたものをどうするか
 */

#target "InDesign"

///////////////設定
var tag_name_text = "inline";//インラインテキストのタグ名
var tag_name_img = "img";//インラインテキストのタグ名
var my_marker = "★★";//タグだけでは目視しずらい時、わかりやすい目印



////////////////////////////////////////////エラー処理 
function myerror(mess) { 
  if (arguments.length > 0) { alert(mess); }
  exit();
}

////////////////////////////////////////////ラジオダイアログ
/*
myTitle    ダイアログ（バー）のタイトル
myPrompt    メッセージ
myList    ラジオボタンに展開するリスト

result    選択したリスト番号
*/
function radioDialog(my_title, my_prompt, my_list){
    var my_dialog = app.dialogs.add({name:my_title, canCancel:true});
    with(my_dialog) {
        with(dialogColumns.add()) {
            // プロンプト
            staticTexts.add({staticLabel:my_prompt});
            with (borderPanels.add()) {
                var my_radio_group = radiobuttonGroups.add();
                with (my_radio_group) {
                    for (var i = 0; i < my_list.length; i++){
                        if (i == 0) {
                            radiobuttonControls.add({staticLabel:my_list[i], checkedState:true});
                        } else {
                        radiobuttonControls.add({staticLabel:my_list[i]});
                        }
                    }
                }
            }
        }
    }
    if (my_dialog.show() == true) {
        var ans = my_radio_group.selectedButton;
        //正常にダイアログを片付ける
        my_dialog.destroy();
        //選択したアイテムの番号を返す
        return ans;
    } else {
        // ユーザが「キャンセル」をクリックしたので、メモリからダイアログボックスを削除
        my_dialog.destroy();
    }
}

////////////////////////////////////////////選択テキストのストーリを返す。選択チェックを兼ねる。
function get_story() {
    var mydocument = app.documents[0];
    if (mydocument.selection.length == 0) {myerror("テキストを選択してください")}
    var myselection = mydocument.selection[0];
    var myclass =myselection.reflect.name;
    myclass = "Text, TextColumn, Story, Paragraph, Line, Word, Character, TextStyleRange".match(myclass);
    if (myclass == null) {myerror("テキストを選択してください")}
    return myselection.parentStory;//ストーリーオブジェクトを返す
}

////////////////////////////////////////////正規表現検索置換
/*
my_range	検索置換の範囲
my_find	検索オブジェクト ex.) {findWhat:"(わたく?し|私)"}
my_change	置換オブジェクト ex.)  {changeTo:"ぼく"}

my_changeが渡されない時は検索のみ、マッチしたオブジェクトを返す。
my_changeが渡されると置換が実行されて、返値はなし。
*/
function my_RegexFindChange(my_range, my_find, my_change) {
    //検索の初期化
    app.findGrepPreferences = NothingEnum.nothing;
    app.changeGrepPreferences = NothingEnum.nothing;
    //検索オプション
    app.findChangeGrepOptions.includeLockedLayersForFind = false;//ロックされたレイヤーをふくめるかどうか
    app.findChangeGrepOptions.includeLockedStoriesForFind = false;//ロックされたストーリーを含めるかどうか
    app.findChangeGrepOptions.includeHiddenLayers = false;//非表示レイヤーを含めるかどうか
    app.findChangeGrepOptions.includeMasterPages = false;//マスターページを含めるかどうか
    app.findChangeGrepOptions.includeFootnotes = false;//脚注を含めるかどうか
    app.findChangeGrepOptions.kanaSensitive = true;//カナを区別するかどうか
    app.findChangeGrepOptions.widthSensitive = true;//全角半角を区別するかどうか

    app.findGrepPreferences.properties = my_find;//検索の設定
    if (my_change == null) {
        return my_range.findGrep();//検索のみの場合：マッチしたオブジェクトを返す
    } else {
        app.changeGrepPreferences.properties = my_change;//置換の設定
        my_range.changeGrep();//検索と置換の実行
    }
}


/////実行
app.scriptPreferences.userInteractionLevel = UserInteractionLevels.interactWithAll;

if (app.documents.length === 0) {myerror("ドキュメントが開かれていません")}
var my_doc = app.documents[0];

//検索範囲を指定
var my_range = radioDialog("put_text_outside.jsx", "処理範囲を指定してください", ["選択範囲", "ストーリー", "ドキュメント"]);
if (my_range ==0) {//選択範囲
    get_story();//選択チェックとして使用
    var my_range_obj = my_doc.selection[0];
} else if (my_range == 1) {//ストーリー
    var my_range_obj = get_story();
} else if (my_range == 2) {//"ドキュメント"
    var my_range_obj = my_doc;
} else {
    myerror("処理をキャンセルしました");
}


var my_inline = my_RegexFindChange(my_range_obj, {findWhat:"~a"});
var tmp_count = my_inline.length;
var my_count = 0;//いくつ置換したかレポート用のカウンター


for (var i = tmp_count - 1; i >= 0 ; i--) { 
    //テキストフレーム
    if ( (my_inline[i].textFrames.length === 1 ) && (my_inline[i].textFrames[0].parentStory.contents !== "") ) {
        if (tag_name_text === "") {
            my_inline[i].contents = my_marker + my_inline[i].textFrames[0].parentStory.contents;
            my_count++;
        } else {
            my_inline[i].contents = my_marker + "<" + tag_name_text + ">" + my_inline[i].textFrames[0].parentStory.contents + "</" + tag_name_text + ">";
            my_count++;
        }
    
    //グラフィックフレーム
    } else if ( (my_inline[i].allGraphics.length === 1 ) ) {
        if (tag_name_img === "") {
            my_inline[i].contents = my_marker + my_inline[i].allGraphics[0].itemLink.name;
            my_count++;
        } else {
            my_inline[i].contents = my_marker + "<" + tag_name_img + ">" + my_inline[i].allGraphics[0].itemLink.name + "</" + tag_name_img + ">";
            my_count++;
        }
        
    }
}


myerror(my_count + "個の置換をしました");
