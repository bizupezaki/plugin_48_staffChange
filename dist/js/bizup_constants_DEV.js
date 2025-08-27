/** 定数の定義 **/
(function () {
    ('use strict');
    console.log('constants.js start');

    // 日付と時刻の設定
    //let DateTime = luxon.DateTime;
    //luxon.Settings.defaultLocale = 'ja';
    //const TODAY = DateTime.local().startOf('day');

    const CUSTOMER_APP_ID = '85'; // 顧客カルテアプリのアプリIDを指定

    window.pluginUtils = window.pluginUtils || {};
    window.pluginUtils.constants = {
        CLIENT: new KintoneRestAPIClient(), // Kintone REST API クライアント
        THIS_APP_ID: kintone.app.getId(), // 現在のアプリID
        //TODAY: TODAY, // 今日の日付
        CUSTOMER_APP_ID: CUSTOMER_APP_ID, // 顧客カルテアプリのアプリID
    };
})();
