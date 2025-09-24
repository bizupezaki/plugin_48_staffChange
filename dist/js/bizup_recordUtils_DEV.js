/**  レコード関連のユーティリティ **/

(function () {
    ('use strict');

    /**
     * アプリ内のフィールド定義を取得する
     * @param {String} appId(アプリID)
     * @return {Object} フィールド定義のオブジェクト
     */
    const fetchFieldDefinitions = async (appId) => {
        // フィールド情報を取得
        try {
            const resp = await window.bizupUtil.constants.CLIENT.app.getFormFields({ app: appId });
            return resp.properties;
        } catch (e) {
            throw new Error('レコードの取得に失敗しました: ' + e.message);
        }
    };

    /**
     * レコード取得
     * @param {Array} fields
     * @param {object} condition
     * @param {object} orderby
     * @param {String} appID
     */
    const getRecords = async (fields, condition, orderby, appID) => {
        let selRes = null;
        try {
            let param = {
                app: appID,
                //condition: condition,
            };
            if (fields.length !== 0) {
                param.fields = fields;
            }
            if (condition !== '') {
                param.condition = condition;
            }
            if (orderby !== '') {
                param.orderBy = orderby;
            }

            selRes = await window.bizupUtil.constants.CLIENT.record.getAllRecords(param);
            if (selRes.length === 0) {
                // データがなかった場合
                console.log('該当データなし！：', param);
            }
            return selRes;
        } catch (e) {
            //console.log('エラーが発生しました！：', e, ':cd:', e.error.code);
            throw e;
        }
    };

    /**
     * レコード更新
     * @param {object} upRecords
     * @param {String} appId
     * @return {object}
     */
    const updateRecords = async (upRecords, appId) => {
        let upRes = null;
        try {
            // レコードの更新
            const upParam = {
                app: appId,
                records: upRecords,
            };
            console.log('upParam:', upParam);
            upRes = await window.bizupUtil.constants.CLIENT.record.updateAllRecords(upParam);
            return upRes;
        } catch (e) {
            throw e;
        }
    };

    /**
     * レコード新規追加
     * @param {object} addRecords
     * @return {object}
     */
    const insertRecords = async (addRecords, appId) => {
        let addRes = null;
        try {
            const addParam = {
                app: appId,
                records: addRecords,
            };
            addRes = await window.bizupUtil.constants.CLIENT.record.addAllRecords(addParam);
            //console.log(addRes);
            return addRes;
        } catch (e) {
            throw e;
        }
    };

    /**
     * レコード削除
     * @param {object} delRecords
     * @return {object}
     */
    const deleteRecords = async (delRecords, appId) => {
        let delRes = null;
        try {
            const delParam = {
                app: appId,
                records: delRecords,
            };
            delRes = await window.bizupUtil.constants.CLIENT.record.deleteAllRecords(delParam);
            //console.log(delRes);
            return delRes;
        } catch (e) {
            throw e;
        }
    };

    // グローバル変数として定義
    window.bizupUtil = window.bizupUtil || {};
    window.bizupUtil.recordUtils = {
        fetchFieldDefinitions: fetchFieldDefinitions,
        getRecords: getRecords,
        updateRecords: updateRecords,
        insertRecords: insertRecords,
        deleteRecords: deleteRecords,
    };
})();
