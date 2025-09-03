/** 関数 **/

(function () {
    ('use strict');

    const dispLog = (message) => {
        console.log(message);
    };
    const { toRaw, isProxy } = Vue;

    /**
     * Proxyを再帰的に解除し、完全非リアクティブなクローンを返す
     * @param {any} obj - 対象オブジェクト
     * @returns {any} Proxy解除済みのクローン
     */
    const deepUnproxy = (obj) => {
        // プリミティブ型やnullはそのまま返す
        if (obj === null || typeof obj !== 'object') return obj;

        // Proxy解除（Vue3のreactiveなどはisProxy/isReactiveで判定可能）
        // ここでは汎用的にtoRawがあれば使う
        let raw = obj;
        raw = toRaw(obj);

        // 配列の場合
        if (Array.isArray(raw)) {
            return raw.map(deepUnproxy);
        } else if (typeof raw === 'object') {
            // オブジェクトの場合
            const clone = {};
            for (const key in raw) {
                if (Object.prototype.hasOwnProperty.call(raw, key)) {
                    // 継承されたkeyは除外（自身のプロパティのみ処理）
                    clone[key] = deepUnproxy(raw[key]);
                }
            }
            return clone;
        } else {
            return raw;
        }
    };

    /**
     * オブジェクト内に特定のキーが存在するかを再帰的にチェックする
     * @param {Object} obj
     * @param {String} targetKey
     * @return {Boolean} true:targetKeyが存在する、false:targetKeyが存在しない
     */
    const containsKey = (obj, targetKey) => {
        return Object.entries(obj).some(([key, value]) => {
            if (key === targetKey) return true;
            if (value && typeof value === 'object') {
                return containsKey(value, targetKey);
            }
            return false;
        });
    };

    /**
     * アプリ内のフィールド定義を取得し、文字列に変換する
     * @param {String} appId(アプリID)
     * @return {String} 定数定義の文字列
     */
    const getFieldMap = async (appId) => {
        const fields = await window.bizupUtil.recordUtils.fetchFieldDefinitions(appId);
        //const map = {};
        let str = '';
        let i = 0;
        for (const [code, field] of Object.entries(fields)) {
            if (i === 0) {
                str = 'const ' + 'APPNAME_FIELDCD' + ' = {\n';
            } else {
                let wkStr = '';
                if ('レコード番号' === field.label) {
                    wkStr = "id: { readCd: '$id', writeCd: 'id',type: '__ID__', name: '' },\n";
                    wkStr = wkStr + "revision: { readCd: '$revision', writeCd: 'revision',type: '__REVISION__', name: '' },\n";
                } else {
                    wkStr = field.label + ": { cd: '" + code + "', type: '" + field.type + "', name: '" + field.label + "' },\n";
                }
                str = str + wkStr;
            }
            i++;
        }
        //str = str + "revision: { cd: '$revision', type: '__REVISION__', name: '' },\n";
        str = str + '};\n';
        return str;
    };

    /**
     * 文字列を安全に数値に変換する
     * 数値として有効な文字列のみをNumberに変換し、無効な場合はnullを返す
     * @param {any} value 変換対象の値
     * @return {Number|null} 数値として有効な場合はNumber、無効な場合はnull
     * @example
     * safeParseNumber('123')      // => 123
     * safeParseNumber('45.6')     // => 45.6
     * safeParseNumber('-10')      // => -10
     * safeParseNumber('0')        // => 0
     * safeParseNumber('abc')      // => null
     * safeParseNumber('12abc')    // => null
     * safeParseNumber(' ')        // => null
     * safeParseNumber('')         // => null
     * safeParseNumber(null)       // => null
     * safeParseNumber(undefined)  // => null
     */
    const safeParseNumber = (value) => {
        try {
            // nullまたはundefinedの場合はnullを返す
            if (value === null || value === undefined) {
                return null;
            }

            // 文字列以外の場合は文字列に変換
            const strValue = String(value);

            // 空文字列または空白のみの場合はnullを返す
            if (strValue.trim() === '') {
                return null;
            }

            // Number()で変換を試行（true/falseが含まれる場合もあるため、これらを除外するため）
            const numValue = Number(strValue);

            // NaNまたは無限大の場合はnullを返す
            if (isNaN(numValue) || !Number.isFinite(numValue)) {
                return null;
            }

            // 元の文字列と数値を文字列化したものが一致するかチェック
            // これにより '12abc' のような部分的に数値な文字列を除外
            /**
             * ' 123 ' → OK（trimすれば一致）
             * '0123' → OK（Number() は 123 になるが、String(123) は '123' → 一致しない → 再チェック）
             * '1.2300' → Number() は 1.23 → String(1.23) は '1.23' → 一致しない → 再チェック
             * '1e3' → Number() は 1000 → String(1000) は '1000' → 一致しない → 再チェック
             */
            const trimmedValue = strValue.trim();
            if (String(numValue) !== trimmedValue) {
                // 科学記法や小数点以下の0を考慮した比較
                const parseFloat = Number.parseFloat(trimmedValue);
                if (parseFloat !== numValue || String(parseFloat) !== trimmedValue) {
                    return null;
                }
            }

            return numValue;
        } catch (error) {
            // 例外が発生した場合はnullを返す
            return null;
        }
    };

    /**
     * 数値を安全にカンマ区切り形式の文字列に変換する
     * 整数・小数両方に対応し、無効な値は空文字列を返す
     * @param {any} value 変換対象の値（数値、文字列、その他）
     * @return {string} カンマ区切り形式の文字列、無効な値の場合は空文字列
     *
     * @example
     * formatNumberWithCommas(1234567)     // => '1,234,567'
     * formatNumberWithCommas(1234.56)     // => '1,234.56'
     * formatNumberWithCommas(-1200)       // => '-1,200'
     * formatNumberWithCommas('1234')      // => '1,234'
     * formatNumberWithCommas('abc')       // => ''
     * formatNumberWithCommas(null)        // => ''
     * formatNumberWithCommas(undefined)   // => ''
     * formatNumberWithCommas(NaN)         // => ''
     * formatNumberWithCommas(0)           // => '0'
     * formatNumberWithCommas(-0)          // => '0'
     */
    const formatNumberWithCommas = (value) => {
        try {
            // null、undefined、空文字列の場合は空文字列を返す
            if (value === null || value === undefined || value === '') {
                return '';
            }

            // 数値型でない場合は文字列に変換してから数値化を試行
            let numValue;
            if (typeof value === 'number') {
                numValue = value;
            } else {
                // 文字列の場合は先にsafeParseNumberで検証
                numValue = safeParseNumber(value);
                if (numValue === null) {
                    return '';
                }
            }

            // NaNや無限大の場合は空文字列を返す
            if (!Number.isFinite(numValue)) {
                return '';
            }

            // toLocaleStringを使用してカンマ区切り形式に変換
            // ja-JPロケールを指定して日本語環境での表示に統一
            return numValue.toLocaleString('ja-JP');
        } catch (error) {
            // 例外が発生した場合は空文字列を返す
            return '';
        }
    };

    // グローバル変数として定義
    window.bizupUtil = window.bizupUtil || {};
    window.bizupUtil.common = {
        dispLog: dispLog,
        getFieldMap: getFieldMap,
        containsKey: containsKey,
        safeParseNumber: safeParseNumber,
        formatNumberWithCommas: formatNumberWithCommas,
        deepUnproxy: deepUnproxy,
    };
})();
