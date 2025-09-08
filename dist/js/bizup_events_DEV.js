/**
 * BIZUP 担当者変更プラグイン
 * Copyright © 2025 Bizup
 */
(function (PLUGIN_ID) {
    'use strict';

    const CONTAINER_ID = '#bz_update_staffs_container_DEV';
    const { ref, reactive, h, computed, onMounted } = Vue;

    // 設定値読み込み用変数
    var CONFDATA = kintone.plugin.app.getConfig(PLUGIN_ID);
    // 設定値読み込み
    // if (Object.keys(CONFDATA).length === 0) {
    //     return;
    // }

    //const client = new KintoneRestAPIClient();
    //const THIS_APP_ID = kintone.app.getId();
    const utils = window.bizupUtil; // 共通ユーティリティ
    const MAX_PATTERN = 3; // 追加パターンの最大数
    const HIGHTLIGHT_COLOR = '#ffecb3'; // ハイライトカラー

    // console.log(CONF);

    // パターン追加テーブル
    const setPattern = {
        props: ['pattern', 'colspan'],
        template: `
            <tr v-if="pattern && pattern.length!==0">
                <th :colspan="colspan"></th>
                <th v-for="(item,index) in pattern" :key="index" colspan="4">{{item.name}}</th>
            </tr>
        `,
    };

    // v-select
    const setVselect = {
        props: ['items', 'moduleValue', 'func'],
        template: `
            <div style="margin:20px 0;">
                <v-select :options="items" label="name" v-model="moduleValue" :filter="func">
                    <template v-slot:no-options="{ search, searching }"><!-- 検索結果がなかった場合のお約束…search:ユーザが入力した文字　searching:検索中かどうか -->
                        <div>担当者が見つかりません</div>
                    </template>
                    <template #option="{ code,name }"><!-- itemsのデータ構造による -->
                        <div>［{{ code }}］{{ name }}</div>
                    </template>
                </v-select>
            </div>
        `,
    };
    // vuer application
    const APP = {
        components: {
            'pattern-set': setPattern,
            'v-select': window['vue-select'], // 外部ライブラリ
        },
        setup() {
            const STATE = reactive({
                testData: [
                    {
                        code: '1001',
                        name: '山田 太郎',
                        kana: 'やまだ たろう',
                        orgs: [
                            { name: '営業部', code: '01_営業部' },
                            { name: '開発部', code: '02_開発部' },
                        ],
                    },
                    {
                        code: '1002',
                        name: '鈴木 次郎',
                        kana: 'すずき じろう',
                        orgs: [{ name: '営業2部', code: '03_営業2部' }],
                    },
                    {
                        code: '1003',
                        name: '佐藤 三郎',
                        kana: 'さとう さぶろう',
                        orgs: [{ name: '営業2部', code: '03_営業2部' }],
                    },
                    {
                        code: '1004',
                        name: '田中 花子',
                        kana: 'たなか はなこ',
                        orgs: [{ name: '営業部', code: '01_営業部' }],
                    },
                ],
                listData: {},
                listDataPattern: { clickNo: null, datas: [], clickName: '' },
                //patternNames: { len: 0, no: 0, maxlength: 3, names: [] },
                patternNames: { len: 0, index: 1, maxlength: MAX_PATTERN, names: [] },
                testSelectedStaff: null,
                selectedStaff: null,
                filters: {},
                itemLength: 0, // 表示項目数
            });

            // 項目名除外
            const EXCEPT_ITEMS = ['$id', '$revision'];
            // 所属
            const ORG_ITEM = ['チーム', '副チーム'];

            // パターン名登録項目（コードと名称をひとつにした場合、別々にデータも保持するために持っている）
            let PATTERN_NAME_ITEMS = [
                { cd: '$id', label: '', type: '', visible: true },
                { cd: '担当者コード', label: '', type: '', visible: true },
                { cd: '担当者', label: '', type: '', visible: true },
                { cd: '副担当者コード', label: '', type: '', visible: true },
                { cd: '副担当者', label: '', type: '', visible: true },
                { cd: '顧客コード', label: '', type: '', visible: false },
                { cd: '顧客名', label: '', type: '', visible: false },
                { cd: '担当者所属コード', label: '', type: '', visible: false },
                { cd: '担当者所属', label: '', type: '', visible: false },
                { cd: '副担当者所属コード', label: '', type: '', visible: false },
                { cd: '副担当者所属', label: '', type: '', visible: false },
            ];
            const STAFF_CHANGE_FIELDCD = {
                jsonData: { cd: 'JSON', type: 'MULTI_LINE_TEXT', name: 'JSON' },
                patternName: { cd: 'パターン名', type: 'SINGLE_LINE_TEXT', name: 'パターン名' },
            };

            // コードと名称をひとつにまとめる
            const SELECTTYPE_NAME_ITEMS = [
                { cd: '担当者コード名', type: '', label: '[担当者コード] 担当者名', index: 1 },
                { cd: '副担当者コード名', type: '', label: '[副担当者コード] 副担当者名', index: 3 },
                { cd: '顧客コード名', type: '', label: '[顧客コード] 顧客名', index: 0 },
                { cd: '担当者所属コード名', type: '', label: '[担当者所属コード] 担当者所属', index: 2 },
                { cd: '副担当者所属コード名', type: '', label: '[副担当者所属コード] 副担当者所属', index: 4 },
            ];
            const CONF = CONFDATA.CONFIG_DATA ? JSON.parse(CONFDATA.CONFIG_DATA) : '';

            const selectedStaffName = computed(() => {
                if (!STATE.testSelectedStaff) return '';
                const staff = STATE.testData.find((s) => s.code === STATE.testSelectedStaff);
                return staff ? staff.name : '';
            });

            /*const patternName = computed(() => {
                console.log('test');
                return STATE.patternName ? STATE.patternName : '';
            });*/

            /**
             * v-select用フィルタ
             * @param {object} options 取得フィールド(選択されたもの)
             * @param {string} label ユーザが入力した文字
             * @param {string} itemText getOptionLabel(option)の結果（表示ラベル）
             * @returns {array} フィルタリングされたオプション
             */
            function customFilter(options, label, itemText) {
                // 自動的に3つの引数がおくられてくる
                if (!options) return false;
                if (!label) return options;
                const lower = label.toLowerCase(); // 大文字小文字の区別をしないため
                return options.filter((option) => {
                    return (
                        (option.code && option.code.toLowerCase().includes(lower)) ||
                        (option.name && option.name.toLowerCase().includes(lower)) ||
                        (option.kana && option.kana.toLowerCase().includes(lower)) ||
                        (Array.isArray(option.orgs) &&
                            option.orgs.some(function (org) {
                                return org && org.name && org.name.toLowerCase().includes(lower);
                            }))
                    );
                });
            }

            /**
             * 一覧表示
             * @param {array} fields 取得フィールド
             * @param {string} condition 検索条件
             * @param {string} orderby ソート順
             * @param {number} appId アプリID
             * @returns {} res レコード
             */
            const getRecords = async (fields, condition, orderby, appId) => {
                //console.log('getRecords');
                let res = null;

                try {
                    res = await utils.recordUtils.getRecords(fields, condition, orderby, appId);
                    if (res.length === 0) {
                        console.log('該当データなし！');
                    } else {
                    }
                    return res;
                } catch (error) {
                    console.error('getRecords:', error);
                }
            };

            /**
             * 一覧表示
             * @param {array} fields 取得フィールド
             * @param {string} condition 検索条件
             * @param {string} orderby ソート順
             * @param {number} appId アプリID
             * @returns {} res レコード
             */
            const insertRecords = async (data, appId) => {
                let res = null;
                try {
                    res = await utils.recordUtils.insertRecords(data, appId);
                    if (res.length === 0) {
                        console.log(jyoken, ':登録データなし！');
                    } else {
                    }
                } catch (error) {
                    console.error('updateData:', error);
                }
            };

            /**
             * 未入力チェック
             * @param {String} value
             * @param {string} label 項目名
             * @returns {}
             */
            const validator = (value, label) => {
                if (!value || String(value).trim() === '') {
                    return label + 'を入力してください';
                }
                return null;
            };

            /**
             * パターン名入力画面作成
             * @param {String} title
             * @param {string} text
             * @param {string} inputType
             * @param {function} inputValidator
             * @param {string} inputValue
             * @param {string} confirmButtonText
             * @param {string} cancelButtonText
             * @returns {}
             */
            const showConfirmSwal = async ({ title, text, inputType = 'text', inputValidator, inputValue = '', confirmButtonText = 'OK', cancelButtonText = 'キャンセル' }) => {
                try {
                    const result = await Swal.fire({
                        title: title,
                        text: text,
                        input: inputType, // 'text', 'email', 'number', 'password', 'textarea', 'select', 'radio', 'checkbox', 'file'
                        showCancelButton: true,
                        confirmButtonText: confirmButtonText,
                        cancelButtonText: cancelButtonText,
                        inputValue: inputValue,
                        inputValidator: inputValidator,
                        width: 'auto',
                    });
                    //return result;
                    return result.isConfirmed ? result.value : null;
                } catch (error) {
                    console.error('入力アラートでエラーが発生しました:', error);
                    return {
                        isConfirmed: false, // はいクリックNG
                        isDismissed: true, // いいえクリックOK
                        isDenied: false, // キャンセルクリックNG
                        value: null,
                    };
                }
            };

            /**
             * パターン追加
             */
            const addPattern = async () => {
                //const fields = await utils.common.getFieldMap(utils.constants.THIS_APP_ID);
                //console.log('fields:', fields);
                if (STATE.patternNames.len >= MAX_PATTERN) {
                    Swal.fire({
                        title: 'パターン追加',
                        text: '追加できるパターンは最大' + MAX_PATTERN + 'つまでです。',
                        icon: 'warning',
                        confirmButtonText: '閉じる',
                    });
                    return;
                }

                // 入力画面表示
                const result = await showConfirmSwal({
                    title: 'パターン追加',
                    text: '新しいパターンの名前を入力してください。',
                    inputType: 'text',
                    confirmButtonText: '実行',
                    cancelButtonText: 'キャンセル',
                    inputValidator: (value) => validator(value, 'パターン名'),
                });
                //console.log('result:', result);
                if (result === null) {
                    // キャンセルの場合
                    return;
                }

                // JSONに変換
                const filtered = STATE.listData.datas.map((item) => {
                    return {
                        [PATTERN_NAME_ITEMS[0].cd]: item.datas[PATTERN_NAME_ITEMS[0].cd], // $id

                        [PATTERN_NAME_ITEMS[1].cd]: item.datas[PATTERN_NAME_ITEMS[1].cd], // 担当者
                        [PATTERN_NAME_ITEMS[2].cd]: item.datas[PATTERN_NAME_ITEMS[2].cd],
                        [PATTERN_NAME_ITEMS[3].cd]: item.datas[PATTERN_NAME_ITEMS[3].cd], // 副担当者
                        [PATTERN_NAME_ITEMS[4].cd]: item.datas[PATTERN_NAME_ITEMS[4].cd],

                        [PATTERN_NAME_ITEMS[7].cd]: item.datas[PATTERN_NAME_ITEMS[7].cd], // 担当者所属
                        [PATTERN_NAME_ITEMS[8].cd]: item.datas[PATTERN_NAME_ITEMS[8].cd],
                        [PATTERN_NAME_ITEMS[9].cd]: item.datas[PATTERN_NAME_ITEMS[9].cd], // 副担当者所属
                        [PATTERN_NAME_ITEMS[10].cd]: item.datas[PATTERN_NAME_ITEMS[10].cd],
                    };
                });
                const json = JSON.stringify(filtered, null, 2);
                //console.log('JSON:', json);
                // レコード登録
                const insertData = {
                    // id revision はinsert時に不要、仮にあったとしても無視される
                    [STAFF_CHANGE_FIELDCD.jsonData.cd]: { value: json },
                    [STAFF_CHANGE_FIELDCD.patternName.cd]: { value: result },
                };
                //const ref = insertRecords([insertData], utils.constants.THIS_APP_ID);

                // 追加したパターンを一覧に表示
                let cnt = STATE.patternNames.len + 1;
                const staff = ['新' + SELECTTYPE_NAME_ITEMS[0].cd + cnt, '新' + PATTERN_NAME_ITEMS[1].cd + cnt, '新' + PATTERN_NAME_ITEMS[2].cd + cnt];
                const subStaff = ['新' + SELECTTYPE_NAME_ITEMS[1].cd + cnt, '新' + PATTERN_NAME_ITEMS[3].cd + cnt, '新' + PATTERN_NAME_ITEMS[4].cd + cnt];
                const department = ['新' + SELECTTYPE_NAME_ITEMS[3].cd + cnt, '新' + PATTERN_NAME_ITEMS[7].cd + cnt, '新' + PATTERN_NAME_ITEMS[8].cd + cnt];
                const subDepartment = ['新' + SELECTTYPE_NAME_ITEMS[4].cd + cnt, '新' + PATTERN_NAME_ITEMS[9].cd + cnt, '新' + PATTERN_NAME_ITEMS[10].cd + cnt];

                //const staff = ['新' + PATTERN_NAME_ITEMS[1].label + cnt, '新' + PATTERN_NAME_ITEMS[2].label + cnt, '新' + PATTERN_NAME_ITEMS[3].label + cnt, '新' + PATTERN_NAME_ITEMS[4].label + cnt];
                STATE.listData.items.push({ code: staff[0], label: SELECTTYPE_NAME_ITEMS[0].label, type: '' });
                STATE.listData.items.push({ code: department[0], label: SELECTTYPE_NAME_ITEMS[3].label, type: '' });
                STATE.listData.items.push({ code: subStaff[0], label: SELECTTYPE_NAME_ITEMS[1].label, type: '' });
                STATE.listData.items.push({ code: subDepartment[0], label: SELECTTYPE_NAME_ITEMS[4].label, type: '' });
                //STATE.listData.items.push({ code: staff[1], label: PATTERN_NAME_ITEMS[2].label, type: '' });

                //STATE.listData.items.push({ code: staff[3], label: PATTERN_NAME_ITEMS[4].label, type: '' });

                const wkStaff = staff[0] + '_' + cnt;
                const wkSubStaff = subStaff[0] + '_' + cnt;
                const wkDepartment = department[0] + '_' + cnt;
                const wkSubDepartment = subDepartment[0] + '_' + cnt;

                STATE.listData.datas = STATE.listData.datas.map((item) => {
                    return {
                        ...item,
                        datas: {
                            ...item.datas,
                            [staff[0]]: item.datas[SELECTTYPE_NAME_ITEMS[0].cd], // 担当者
                            [staff[1]]: item.datas[PATTERN_NAME_ITEMS[1].cd],
                            [staff[2]]: item.datas[PATTERN_NAME_ITEMS[2].cd],
                            [wkStaff]: item.datas[SELECTTYPE_NAME_ITEMS[0].cd], // 選択値保存用

                            [subStaff[0]]: item.datas[SELECTTYPE_NAME_ITEMS[1].cd], // 副担当者
                            [subStaff[1]]: item.datas[PATTERN_NAME_ITEMS[3].cd],
                            [subStaff[2]]: item.datas[PATTERN_NAME_ITEMS[4].cd],
                            [wkSubStaff]: item.datas[SELECTTYPE_NAME_ITEMS[1].cd],

                            [department[0]]: item.datas[SELECTTYPE_NAME_ITEMS[3].cd], // 担当者所属
                            [department[1]]: item.datas[PATTERN_NAME_ITEMS[7].cd],
                            [department[2]]: item.datas[PATTERN_NAME_ITEMS[8].cd],
                            [wkDepartment]: item.datas[SELECTTYPE_NAME_ITEMS[3].cd],

                            [subDepartment[0]]: item.datas[SELECTTYPE_NAME_ITEMS[4].cd], // 副担当者所属
                            [subDepartment[1]]: item.datas[PATTERN_NAME_ITEMS[9].cd],
                            [subDepartment[2]]: item.datas[PATTERN_NAME_ITEMS[10].cd],
                            [wkSubDepartment]: item.datas[SELECTTYPE_NAME_ITEMS[4].cd],
                        },
                    };
                });
                STATE.patternNames.names.push({ index: cnt, name: result });
                //STATE.patternNames.no = cnt;
                STATE.patternNames.len = cnt;

                // 絞込追加
                STATE.filters[staff[0]] = '';
                //STATE.filters[staff[1]] = '';
                //STATE.filters[staff[2]] = '';
                STATE.filters[subStaff[0]] = '';
                //STATE.filters[subStaff[1]] = '';
                //STATE.filters[subStaff[2]] = '';
                STATE.filters[department[0]] = '';
                STATE.filters[subDepartment[0]] = '';
                // selectのキーを設定
            };

            /**
             * パターン開く
             */
            const openPattern = async () => {
                // 全フィールド取得
                //const fields = STATE.listData.items.map((item) => item.code);
                try {
                    const records = await getRecords([], '', '', utils.constants.THIS_APP_ID);
                    //console.log('openPattern取得結果:', records);
                    // 取得したデータをSwalを使って、表で表示する
                    if (!records || records.length === 0) {
                        Swal.fire({
                            title: '取得データ一覧',
                            html: '<div>データがありません</div>',
                            //width: '60%',
                            confirmButtonText: '閉じる',
                        });
                        return;
                    }
                    // 画面表示
                    const key = STAFF_CHANGE_FIELDCD.patternName.cd;
                    const label = STAFF_CHANGE_FIELDCD.patternName.name;
                    let patterns = [];
                    let tableHtml = '<table id="patternTable" class="bz_table_def">';
                    tableHtml += '<thead><tr>';
                    tableHtml += `<th>${label}</th>`;
                    tableHtml += '</tr></thead>';
                    tableHtml += '<tbody>';
                    records.forEach((rec) => {
                        tableHtml += '<tr>';
                        let val = rec[key]?.value ?? '';
                        tableHtml += `<td>${val}</td>`;
                        tableHtml += '</tr>';

                        // JSONデータを取得
                        patterns.push({ name: rec[key].value, jsonData: rec[STAFF_CHANGE_FIELDCD.jsonData.cd]?.value ?? '', id: rec['$id'].value });
                    });
                    tableHtml += '</tbody></table>';
                    const result = await Swal.fire({
                        title: '取得データ一覧',
                        html: tableHtml,
                        showCancelButton: true,
                        confirmButtonText: '実行',
                        cancelButtonText: 'キャンセル',
                        didOpen: () => {
                            setupRowClickHighlighting('patternTable');
                        },
                        //width: '80%',
                    });
                    if (result.dismiss === Swal.DismissReason.cancel) {
                        // キャンセルの場合
                        return;
                    }

                    // OK処理
                    // 3つより多い場合はエラー
                    if (STATE.patternNames.len >= MAX_PATTERN) {
                        Swal.fire({
                            title: 'パターン追加',
                            text: '追加できるパターンは最大' + MAX_PATTERN + 'つまでです。',
                            icon: 'warning',
                            confirmButtonText: '閉じる',
                        });
                        return;
                    }

                    STATE.listDataPattern.datas = patterns;
                    //console.log('listDataPattern:', STATE.listDataPattern);

                    // データをJSONからオブジェクトに変換してSTATEに保存
                    const jsonData = STATE.listDataPattern.datas[STATE.listDataPattern.clickNo].jsonData;
                    const clickData = JSON.parse(jsonData);
                    //console.log('クリックされた行のデータ:', clickData);

                    // パターン表示
                    let cnt = STATE.patternNames.len + 1;
                    const staff = ['新' + SELECTTYPE_NAME_ITEMS[0].cd + cnt, '新' + PATTERN_NAME_ITEMS[1].cd + cnt, '新' + PATTERN_NAME_ITEMS[2].cd + cnt];
                    const subStaff = ['新' + SELECTTYPE_NAME_ITEMS[1].cd + cnt, '新' + PATTERN_NAME_ITEMS[3].cd + cnt, '新' + PATTERN_NAME_ITEMS[4].cd + cnt];
                    const department = ['新' + SELECTTYPE_NAME_ITEMS[3].cd + cnt, '新' + PATTERN_NAME_ITEMS[7].cd + cnt, '新' + PATTERN_NAME_ITEMS[8].cd + cnt];
                    const subDepartment = ['新' + SELECTTYPE_NAME_ITEMS[4].cd + cnt, '新' + PATTERN_NAME_ITEMS[9].cd + cnt, '新' + PATTERN_NAME_ITEMS[10].cd + cnt];

                    STATE.listData.items.push({ code: staff[0], label: SELECTTYPE_NAME_ITEMS[0].label, type: '' });
                    STATE.listData.items.push({ code: department[0], label: SELECTTYPE_NAME_ITEMS[3].label, type: '' });
                    STATE.listData.items.push({ code: subStaff[0], label: SELECTTYPE_NAME_ITEMS[1].label, type: '' });
                    STATE.listData.items.push({ code: subDepartment[0], label: SELECTTYPE_NAME_ITEMS[4].label, type: '' });
                    //STATE.listData.items.push({ code: staff[3], label: PATTERN_NAME_ITEMS[4].label, type: '' });
                    /*const staff = ['新' + PATTERN_NAME_ITEMS[1].label + cnt, '新' + PATTERN_NAME_ITEMS[2].label + cnt, '新' + PATTERN_NAME_ITEMS[3].label + cnt, '新' + PATTERN_NAME_ITEMS[4].label + cnt];
                    STATE.listData.items.push({ code: staff[1], label: PATTERN_NAME_ITEMS[2].label, type: '' });
                    STATE.listData.items.push({ code: staff[3], label: PATTERN_NAME_ITEMS[4].label, type: '' });*/

                    const wkStaff = staff[0] + '_' + cnt;
                    const wkSubStaff = subStaff[0] + '_' + cnt;
                    const wkDepartment = department[0] + '_' + cnt;
                    const wkSubDepartment = subDepartment[0] + '_' + cnt;

                    // STATE.listData.datasに追加
                    STATE.listData.datas = STATE.listData.datas.map((item) => {
                        // JSONデータから該当IDのデータを取得
                        const matched = clickData.find((data) => data['$id'] === item.datas['$id']);
                        return {
                            ...item,
                            datas: {
                                ...item.datas,
                                [staff[0]]: item.datas[SELECTTYPE_NAME_ITEMS[0].cd], // 担当者
                                [staff[1]]: item.datas[PATTERN_NAME_ITEMS[1].cd],
                                [staff[2]]: item.datas[PATTERN_NAME_ITEMS[2].cd],
                                [wkStaff]: item.datas[SELECTTYPE_NAME_ITEMS[0].cd], // 選択値保存用

                                [subStaff[0]]: item.datas[SELECTTYPE_NAME_ITEMS[1].cd], // 副担当者
                                [subStaff[1]]: item.datas[PATTERN_NAME_ITEMS[3].cd],
                                [subStaff[2]]: item.datas[PATTERN_NAME_ITEMS[4].cd],
                                [wkSubStaff]: item.datas[SELECTTYPE_NAME_ITEMS[1].cd],

                                [department[0]]: item.datas[SELECTTYPE_NAME_ITEMS[3].cd], // 担当者所属
                                [department[1]]: item.datas[PATTERN_NAME_ITEMS[7].cd],
                                [department[2]]: item.datas[PATTERN_NAME_ITEMS[8].cd],
                                [wkDepartment]: item.datas[SELECTTYPE_NAME_ITEMS[3].cd],

                                [subDepartment[0]]: item.datas[SELECTTYPE_NAME_ITEMS[4].cd], // 副担当者所属
                                [subDepartment[1]]: item.datas[PATTERN_NAME_ITEMS[9].cd],
                                [subDepartment[2]]: item.datas[PATTERN_NAME_ITEMS[10].cd],
                                [wkSubDepartment]: item.datas[SELECTTYPE_NAME_ITEMS[4].cd],
                                /*[staff[0]]: matched ? matched[PATTERN_NAME_ITEMS[1].cd] : '',
                                [staff[1]]: matched ? matched[PATTERN_NAME_ITEMS[2].cd] : '',
                                [staff[2]]: matched ? matched[PATTERN_NAME_ITEMS[3].cd] : '',
                                [staff[3]]: matched ? matched[PATTERN_NAME_ITEMS[4].cd] : '',*/
                            },
                        };
                    });

                    // パターン追加
                    STATE.patternNames.names.push({ index: STATE.patternNames.len, name: STATE.listDataPattern.clickName });
                    //STATE.patternNames.no = cnt;
                    STATE.patternNames.len = cnt;

                    // 絞込追加
                    STATE.filters[staff[0]] = '';
                    STATE.filters[subStaff[0]] = '';
                    STATE.filters[department[0]] = '';
                    STATE.filters[subDepartment[0]] = '';
                    /*STATE.filters[staff[0]] = '';
                    STATE.filters[staff[1]] = '';
                    STATE.filters[staff[2]] = '';
                    STATE.filters[staff[3]] = '';*/
                } catch (error) {
                    console.error('openPattern取得失敗:', error);
                }
            };

            /**
             * 行クリックでハイライト設定
             * @param {string} tableId テーブルID
             * @param {string} highlightClass ハイライトカラー
             */
            const setupRowClickHighlighting = (tableId, highlightClass = HIGHTLIGHT_COLOR) => {
                const rows = document.querySelectorAll(`#${tableId} tbody tr`);
                rows.forEach((row) => {
                    row.addEventListener('click', () => {
                        // 既存のハイライトを削除
                        rows.forEach((r) => {
                            r.style.backgroundColor = '';
                        });
                        // クリックされた行にハイライトを追加
                        row.style.backgroundColor = highlightClass;

                        // クリックされた行のデータをSTATEに保存
                        const tbody = row.parentElement;
                        const rowsInTbody = Array.from(tbody.querySelectorAll('tr'));
                        const relativeIndex = rowsInTbody.indexOf(row);

                        STATE.listDataPattern.clickNo = relativeIndex;
                        STATE.listDataPattern.clickName = row.textContent;
                        console.log('クリックされた行のインデックス:', STATE.listDataPattern.clickNo);
                    });
                });
            };

            /**
             * フィルタリングされた行を取得
             */
            const filteredRows = computed(() => {
                if (!STATE.listData?.datas || !Array.isArray(STATE.listData.datas)) return [];
                return STATE.listData.datas.filter((item) => {
                    return Object.keys(STATE.filters).every((key) => {
                        const filterValue = String(STATE.filters[key] ?? '').trim();
                        if (filterValue === 'すべて') return true;
                        //const cellValue = String(item.datas[key] ?? '');
                        let cd = '';
                        let nm = '';
                        if (key === SELECTTYPE_NAME_ITEMS[0].cd) {
                            cd = PATTERN_NAME_ITEMS[1].cd;
                            nm = PATTERN_NAME_ITEMS[2].label;
                        } else if (key === SELECTTYPE_NAME_ITEMS[1].cd) {
                            cd = PATTERN_NAME_ITEMS[3].cd;
                            nm = PATTERN_NAME_ITEMS[4].label;
                        } else if (key === SELECTTYPE_NAME_ITEMS[2].cd) {
                            cd = PATTERN_NAME_ITEMS[5].cd;
                            nm = PATTERN_NAME_ITEMS[6].label;
                        } else if (key === SELECTTYPE_NAME_ITEMS[3].cd) {
                            cd = PATTERN_NAME_ITEMS[7].cd;
                            nm = PATTERN_NAME_ITEMS[8].label;
                        } else if (key === SELECTTYPE_NAME_ITEMS[4].cd) {
                            cd = PATTERN_NAME_ITEMS[9].cd;
                            nm = PATTERN_NAME_ITEMS[10].label;
                        } else {
                            /*if (key === PATTERN_NAME_ITEMS[2].cd || key === PATTERN_NAME_ITEMS[4].cd || key === PATTERN_NAME_ITEMS[6].cd) {
                            cd = key === PATTERN_NAME_ITEMS[2].cd ? PATTERN_NAME_ITEMS[1].cd : PATTERN_NAME_ITEMS[3].cd;
                            nm = key === PATTERN_NAME_ITEMS[2].cd ? PATTERN_NAME_ITEMS[2].label : PATTERN_NAME_ITEMS[4].label;
                        }*/

                            // この箇所はメソッドにするかも
                            // 新パターン名での絞込対応
                            const indexes = STATE.patternNames.names.map((item) => item.index);
                            if (indexes.some((index) => key.includes(index))) {
                                const num = Number(key.match(/\d+/)); // 数値のみ取得
                                const str = key.replace(/\d+/g, ''); // 数値部分削除
                                if (str === '新' + PATTERN_NAME_ITEMS[2].cd) {
                                    cd = '新' + PATTERN_NAME_ITEMS[1].cd + num;
                                    nm = '新' + PATTERN_NAME_ITEMS[2].label + num;
                                } else if (str === '新' + PATTERN_NAME_ITEMS[4].cd) {
                                    cd = '新' + PATTERN_NAME_ITEMS[3].cd + num;
                                    nm = '新' + PATTERN_NAME_ITEMS[4].label + num;
                                }
                            }
                        }
                        const cellValue = key === nm ? item.datas[cd] : item.datas[key] ?? '';
                        if (filterValue === '') return true; // 絞込なし
                        if (filterValue === '__EMPTY__') return cellValue === ''; // 空のみ
                        return cellValue.toLowerCase().includes(filterValue.toLowerCase());
                    });
                });
            });

            /**
             * 絞込作成
             */
            const getUniqueOptions = (code) => {
                //const values = (STATE.listData?.datas ?? []).map((item) => item.datas[code]).filter((v) => v !== undefined && v !== null && String(v).trim() !== '');
                //return [...new Set(values)];
                let cd = '';
                let nm = '';

                // この箇所はメソッドにするかも
                const indexes = STATE.patternNames.names.map((item) => item.index);
                //if (code.includes(indexes)) {
                if (indexes.some((index) => code.includes(index))) {
                    // 新パターン名での絞込対応
                    const num = Number(code.match(/\d+/)); // 数値のみ取得
                    const str = code.replace(/\d+/g, ''); // 数値部分削除
                    if (str === '新' + SELECTTYPE_NAME_ITEMS[0].cd) {
                        cd = '新' + PATTERN_NAME_ITEMS[1].cd + num;
                        nm = '新' + PATTERN_NAME_ITEMS[2].label + num;
                    } else if (str === '新' + SELECTTYPE_NAME_ITEMS[1].cd) {
                        cd = '新' + PATTERN_NAME_ITEMS[3].cd + num;
                        nm = '新' + PATTERN_NAME_ITEMS[4].label + num;
                    }
                    /*if (str === '新' + PATTERN_NAME_ITEMS[2].cd) {
                        cd = '新' + PATTERN_NAME_ITEMS[1].cd + num;
                        nm = '新' + PATTERN_NAME_ITEMS[2].label + num;
                    } else if (str === '新' + PATTERN_NAME_ITEMS[4].cd) {
                        cd = '新' + PATTERN_NAME_ITEMS[3].cd + num;
                        nm = '新' + PATTERN_NAME_ITEMS[4].label + num;
                    }*/
                }

                // 担当者、副担当者、顧客名のときはコード＋名前で表示
                if (code === SELECTTYPE_NAME_ITEMS[0].cd) {
                    cd = PATTERN_NAME_ITEMS[1].cd;
                    nm = PATTERN_NAME_ITEMS[2].label;
                } else if (code === SELECTTYPE_NAME_ITEMS[1].cd) {
                    cd = PATTERN_NAME_ITEMS[3].cd;
                    nm = PATTERN_NAME_ITEMS[4].label;
                } else if (code === SELECTTYPE_NAME_ITEMS[2].cd) {
                    cd = PATTERN_NAME_ITEMS[5].cd;
                    nm = PATTERN_NAME_ITEMS[6].label;
                } else if (code === SELECTTYPE_NAME_ITEMS[3].cd) {
                    cd = PATTERN_NAME_ITEMS[7].cd;
                    nm = PATTERN_NAME_ITEMS[8].label;
                } else if (code === SELECTTYPE_NAME_ITEMS[4].cd) {
                    cd = PATTERN_NAME_ITEMS[9].cd;
                    nm = PATTERN_NAME_ITEMS[10].label;
                }

                /**if (code === SELECTTYPE_NAME_ITEMS[0].cd || code === SELECTTYPE_NAME_ITEMS[1].cd) {
                    /*const pairs = (STATE.listData?.datas ?? []).map((item) => ({
                        label: '[' + item.datas.担当者コード + ']' + item.datas.担当者,
                        value: item.datas.担当者コード,
                    }));*/
                //cd = code === SELECTTYPE_NAME_ITEMS[0].cd ? PATTERN_NAME_ITEMS[1].cd : PATTERN_NAME_ITEMS[3].cd;
                //nm = code === SELECTTYPE_NAME_ITEMS[0].cd ? PATTERN_NAME_ITEMS[2].label : PATTERN_NAME_ITEMS[4].label;

                /*if (code === PATTERN_NAME_ITEMS[2].cd) {
                        // 担当者
                        cd = PATTERN_NAME_ITEMS[1].cd;
                        nm = PATTERN_NAME_ITEMS[2].label;
                    } else {
                        // 副担当者
                        cd = PATTERN_NAME_ITEMS[3].cd;
                        nm = PATTERN_NAME_ITEMS[4].label;
                    }*/
                //}

                const pairs = (STATE.listData?.datas ?? [])
                    .filter((item) => item.datas[cd] !== undefined && item.datas[cd] !== null && String(item.datas[cd]).trim() !== '')
                    .map((item) => ({
                        label: '[' + item.datas[cd] + ']' + item.datas[nm],
                        value: item.datas[cd],
                    }));
                const unique = new Map();
                pairs.forEach((pair) => {
                    if (!unique.has(pair.value)) {
                        unique.set(pair.value, pair.label);
                    }
                });
                // 配列からオブジェクトに変換して返す
                let rc = Array.from(unique.entries()).map(([value, label]) => ({ value, label }));
                rc = rc.sort((a, b) => {
                    if (a.value < b.value) return -1;
                    if (a.value > b.value) return 1;
                    return 0;
                });
                return rc;

                // それ以外の項目
                //const values = (STATE.listData?.datas ?? []).map((item) => item.datas[code]).filter((v) => v !== undefined && v !== null && String(v).trim() !== '');
                //return [...new Set(values)].map((v) => ({ value: v, label: v }));
            };

            /**
             * ラベルから新たにラベルを作成
             * @param {string} label（ラベル）
             * @return {string} 新たなラベル
             */
            const setNewLabel = (label) => {
                if (label !== PATTERN_NAME_ITEMS[2].label && label !== PATTERN_NAME_ITEMS[4].label) {
                    return label;
                } else {
                    if (label === PATTERN_NAME_ITEMS[2].label) {
                        return SELECTTYPE_NAME_ITEMS[0].label;
                    } else {
                        return SELECTTYPE_NAME_ITEMS[1].label;
                    }
                }
            };

            /**
             * コードから表示非表示判定
             */
            const isVisibleItem = (key) => {
                let rc = true;

                // 除外項目
                const patterns = PATTERN_NAME_ITEMS.filter((item) => item.cd !== '$id').map((cd) => cd.cd);
                const exccempts = EXCEPT_ITEMS.concat(patterns, ORG_ITEM); // id revision 担当者コード　副担当者コード
                if (exccempts.includes(key)) {
                    rc = false;
                }
                return rc;
            };

            /**
             * ラベルから表示非表示判定
             */
            const isVisibleLabel = (label) => {
                let rc = true;

                // 除外項目
                const patterns = PATTERN_NAME_ITEMS.filter((item) => item.cd !== '$id').map((cd) => cd.label);
                const exccempts = EXCEPT_ITEMS.concat(patterns, ORG_ITEM); // id revision 担当者コード　副担当者コード
                if (exccempts.includes(label)) {
                    rc = false;
                }
                return rc;
            };

            /**
             * ラベルから表示非表示判定
             */
            const isSelectType = (label) => {
                let rc = false;

                // 選択項目
                const select = SELECTTYPE_NAME_ITEMS.map((item) => item.label);
                if (select.includes(label)) {
                    rc = true;
                }
                return rc;
            };

            // keyが新担当者コード名、新副担当者コード名のときは、trueをかえす
            const isSelectData = (key) => {
                let rc = false;
                const indexes = STATE.patternNames.names.map((item) => item.index);
                if (indexes.some((index) => key.includes(index))) {
                    const num = Number(key.match(/\d+/)); // 数値のみ取得
                    const str = key.replace(/\d+/g, ''); // 数値部分削除
                    if (str === '新' + SELECTTYPE_NAME_ITEMS[0].cd || str === '新' + SELECTTYPE_NAME_ITEMS[1].cd) {
                        rc = true;
                        //STATE.patternNames.index = num;
                    }
                }
                return rc;
            };

            // 番号設定
            const setNo = (index, key) => {
                let rc = '';
                let name = key;
                let sa = index - STATE.itemLength;
                if (sa <= 3) {
                    rc = '1';
                } else if (sa <= 7) {
                    rc = '2';
                } else {
                    rc = '3';
                }
                return name + '_' + rc;
            };
            /**
             * パターンを追加したデータはすべてselectにする
             */
            const getSelectedStaff = (key) => {
                return [...new Set(STATE.listData.datas.map((item) => item.datas[key]))];
            };

            const changeStaff = (index, event, key) => {
                // 取得したデータをcodeとnameに分割
                // 例: [10002]鈴木 二美 → code: 10002, name: 鈴木 二美
                const value = event.target.value;
                let code = '';
                let name = '';
                const match = value.match(/^\[(.*?)\](.*)$/);
                if (match) {
                    code = match[1];
                    name = match[2];
                }
                STATE.listData.datas[index].datas[key] = value;
                const num = Number(key.match(/\d+/)); // 数値のみ取得
                const str = key.replace(/\d+/g, ''); // 数値部分削除
                let cd = '';
                let nm = '';
                if (str === '新' + SELECTTYPE_NAME_ITEMS[0].cd) {
                    cd = '新' + PATTERN_NAME_ITEMS[1].cd + num;
                    nm = '新' + PATTERN_NAME_ITEMS[2].label + num;
                } else if (str === '新' + SELECTTYPE_NAME_ITEMS[1].cd) {
                    cd = '新' + PATTERN_NAME_ITEMS[3].cd + num;
                    nm = '新' + PATTERN_NAME_ITEMS[4].label + num;
                }
                STATE.listData.datas[index].datas[cd] = code;
                STATE.listData.datas[index].datas[nm] = name;
            };

            /**
             * コードから新たな項目名を作成
             */
            const makeNewItemName = (key) => {
                const indexes = STATE.patternNames.names.map((item) => item.index);
                //if (code.includes(indexes)) {
                let cd = '';
                let nm = '';
                if (indexes.some((index) => key.includes(index))) {
                    // 新パターン名での絞込対応
                    const num = Number(key.match(/\d+/)); // 数値のみ取得
                    const str = key.replace(/\d+/g, ''); // 数値部分削除
                    if (str === '新' + PATTERN_NAME_ITEMS[2].cd) {
                        cd = '新' + PATTERN_NAME_ITEMS[1].cd + num;
                        nm = '新' + PATTERN_NAME_ITEMS[2].label + num;
                    } else if (str === '新' + PATTERN_NAME_ITEMS[4].cd) {
                        cd = '新' + PATTERN_NAME_ITEMS[3].cd + num;
                        nm = '新' + PATTERN_NAME_ITEMS[4].label + num;
                    }
                }
                return { cd: cd, nm: nm };
            };

            Vue.onMounted(async () => {
                // 初期表示

                // 取得フィールド作成
                let fields = [];
                let items = [];
                const keys = Object.keys(CONF).filter((key) => key !== 'apps');
                const cd = PATTERN_NAME_ITEMS.map((item) => item.cd);
                console.log('keys:', keys);
                keys.forEach((key) => {
                    CONF[key].forEach((field) => {
                        //console.log(key, ':', field.code);
                        fields.push(field.code);
                        items.push({ code: field.code, label: field.label, type: field.type });
                        // パターン名項目の設定
                        if (cd.includes(field.code)) {
                            const index = PATTERN_NAME_ITEMS.findIndex((item) => item.cd === field.code);
                            if (index !== -1) {
                                PATTERN_NAME_ITEMS[index].label = field.label;
                                // CONFのstaffFieldsにはtypeがないので、空を設定
                                if (field.type === undefined) {
                                    PATTERN_NAME_ITEMS[index].type = '';
                                } else {
                                    PATTERN_NAME_ITEMS[index].type = field.type;
                                }
                            }
                        }
                    });
                });

                // 項目名の設定
                STATE.listData = { items: items };
                STATE.filters = items.reduce((acc, item) => {
                    //acc[item.code] = item.label;
                    acc[item.code] = '';
                    return acc;
                }, {});

                // id revision追加
                fields.push(EXCEPT_ITEMS[0]);
                fields.push(EXCEPT_ITEMS[1]);

                // 担当者コード　副担当者コードがない場合は追加
                if (fields.indexOf(PATTERN_NAME_ITEMS[1].cd) === -1) {
                    fields.push(PATTERN_NAME_ITEMS[1].cd);
                    //PATTERN_NAME_ITEMS[1].visible = false;
                    PATTERN_NAME_ITEMS[1].label = PATTERN_NAME_ITEMS[1].cd;
                } else {
                    //PATTERN_NAME_ITEMS[1].visible = true;
                }
                if (fields.indexOf(PATTERN_NAME_ITEMS[3].cd) === -1) {
                    fields.push(PATTERN_NAME_ITEMS[3].cd);
                    // PATTERN_NAME_ITEMS[3].visible = false;
                    PATTERN_NAME_ITEMS[3].label = PATTERN_NAME_ITEMS[3].cd;
                } else {
                    //PATTERN_NAME_ITEMS[3].visible = true;
                }
                STATE.listData.items.push({ code: SELECTTYPE_NAME_ITEMS[0].cd, label: SELECTTYPE_NAME_ITEMS[0].label, type: '' });
                STATE.listData.items.push({ code: SELECTTYPE_NAME_ITEMS[1].cd, label: SELECTTYPE_NAME_ITEMS[1].label, type: '' });
                STATE.filters[SELECTTYPE_NAME_ITEMS[0].cd] = '';
                STATE.filters[SELECTTYPE_NAME_ITEMS[1].cd] = '';
                //const orderby = SUM_FIELDCD.year.cd + ' asc, ' + SUM_FIELDCD.month.cd + ' asc';

                // 顧客コード　顧客名　は必ず追加
                if (fields.indexOf(PATTERN_NAME_ITEMS[5]) === -1) {
                    fields.push(PATTERN_NAME_ITEMS[5].cd);
                    PATTERN_NAME_ITEMS[5].label = PATTERN_NAME_ITEMS[5].cd;
                }
                if (fields.indexOf(PATTERN_NAME_ITEMS[6]) === -1) {
                    fields.push(PATTERN_NAME_ITEMS[6].cd);
                    PATTERN_NAME_ITEMS[6].label = PATTERN_NAME_ITEMS[6].cd;
                }
                STATE.listData.items.push({ code: SELECTTYPE_NAME_ITEMS[2].cd, label: SELECTTYPE_NAME_ITEMS[2].label, type: '' });
                STATE.filters[SELECTTYPE_NAME_ITEMS[2].cd] = '';
                console.log('fields:', fields);

                // 担当者所属　副担当者所属　は必ず追加
                if (fields.indexOf(ORG_ITEM[0]) === -1) {
                    fields.push(ORG_ITEM[0]);
                }
                if (fields.indexOf(ORG_ITEM[1]) === -1) {
                    fields.push(ORG_ITEM[1]);
                }
                PATTERN_NAME_ITEMS[7].label = PATTERN_NAME_ITEMS[7].cd;
                PATTERN_NAME_ITEMS[8].label = PATTERN_NAME_ITEMS[8].cd;
                PATTERN_NAME_ITEMS[9].label = PATTERN_NAME_ITEMS[9].cd;
                PATTERN_NAME_ITEMS[10].label = PATTERN_NAME_ITEMS[10].cd;
                STATE.listData.items.push({ code: SELECTTYPE_NAME_ITEMS[3].cd, label: SELECTTYPE_NAME_ITEMS[3].label, type: '' });
                STATE.listData.items.push({ code: SELECTTYPE_NAME_ITEMS[4].cd, label: SELECTTYPE_NAME_ITEMS[4].label, type: '' });
                STATE.filters[SELECTTYPE_NAME_ITEMS[3].cd] = '';
                STATE.filters[SELECTTYPE_NAME_ITEMS[4].cd] = '';
                console.log('fields:', fields);

                // 項目の並び順を変更する
                // 「顧客名」「担当者」「担当者所属」「副担当者」「副担当者所属」の順序にし、それ以外はこの順序の後に表示する
                const orderKeys = SELECTTYPE_NAME_ITEMS.slice()
                    .sort((a, b) => a.index - b.index)
                    .map((item) => item.label);
                STATE.listData.items = [...orderKeys.map((key) => STATE.listData.items.find((item) => item.label === key)).filter(Boolean), ...STATE.listData.items.filter((item) => !orderKeys.includes(item.label))];

                // レコード取得
                try {
                    const records = await getRecords(fields, '', '', utils.constants.CUSTOMER_APP_ID);
                    //const items = Object.keys(records[0]).filter((item) => !EXCEPT_ITEMS.includes(item));
                    let items = [];
                    let i = 0;
                    records.forEach((rec) => {
                        items.push({ datas: {} });
                        STATE.listData.items.forEach((item) => {
                            //console.log(item.label);
                            if (utils.common.containsKey(rec, item.code)) {
                                //items[i].datas[item.label] = { value: rec[item.label].value };
                                if (Array.isArray(rec[item.code].value) && rec[item.code].value.length === 0) {
                                    // 配列が空だった場合
                                    items[i].datas[item.code] = '';
                                } else {
                                    items[i].datas[item.code] = rec[item.code].value;
                                }
                                //console.log(item.code, ':', rec[item.code].value);
                            } else {
                                //items[i].datas[item.label] = { value: '' };
                                items[i].datas[item.code] = '';
                            }
                        });
                        // id 追加
                        items[i].datas[EXCEPT_ITEMS[0]] = rec[EXCEPT_ITEMS[0]].value;

                        // 担当者コード　副担当者コードがなかった場合、追加
                        //if (!PATTERN_NAME_ITEMS[1].visible) {
                        items[i].datas[PATTERN_NAME_ITEMS[1].cd] = rec[PATTERN_NAME_ITEMS[1].cd].value;
                        //}
                        //if (!PATTERN_NAME_ITEMS[3].visible) {
                        items[i].datas[PATTERN_NAME_ITEMS[3].cd] = rec[PATTERN_NAME_ITEMS[3].cd].value;
                        //}

                        // 担当者・副担当者・顧客名の[コード] 名称を追加
                        let wkcode = rec[PATTERN_NAME_ITEMS[1].cd]?.value ?? '';
                        let wkname = rec[PATTERN_NAME_ITEMS[2].cd]?.value ?? '';
                        if (wkcode !== '' && wkname !== '') {
                            items[i].datas[SELECTTYPE_NAME_ITEMS[0].cd] = '[' + wkcode + ']' + wkname;
                        } else {
                            items[i].datas[SELECTTYPE_NAME_ITEMS[0].cd] = '';
                        }

                        // 副担当者
                        wkcode = rec[PATTERN_NAME_ITEMS[3].cd]?.value ?? '';
                        wkname = rec[PATTERN_NAME_ITEMS[4].cd]?.value ?? '';
                        if (wkcode !== '' && wkname !== '') {
                            items[i].datas[SELECTTYPE_NAME_ITEMS[1].cd] = '[' + wkcode + ']' + wkname;
                        } else {
                            items[i].datas[SELECTTYPE_NAME_ITEMS[1].cd] = '';
                        }

                        // 顧客名
                        wkcode = rec[PATTERN_NAME_ITEMS[5].cd]?.value ?? '';
                        wkname = rec[PATTERN_NAME_ITEMS[6].cd]?.value ?? '';
                        if (wkcode !== '' && wkname !== '') {
                            items[i].datas[SELECTTYPE_NAME_ITEMS[2].cd] = '[' + wkcode + ']' + wkname;
                            items[i].datas[PATTERN_NAME_ITEMS[5].cd] = wkcode;
                            items[i].datas[PATTERN_NAME_ITEMS[6].cd] = wkname;
                        } else {
                            items[i].datas[SELECTTYPE_NAME_ITEMS[2].cd] = '';
                            items[i].datas[PATTERN_NAME_ITEMS[5].cd] = '';
                            items[i].datas[PATTERN_NAME_ITEMS[6].cd] = '';
                        }

                        // 担当者所属
                        if (utils.common.containsKey(rec, ORG_ITEM[0]) && Array.isArray(rec[ORG_ITEM[0]].value) && rec[ORG_ITEM[0]].value.length > 0) {
                            wkcode = rec[ORG_ITEM[0]].value[0].code;
                            wkname = rec[ORG_ITEM[0]].value[0].name;
                        } else {
                            wkcode = '';
                            wkname = '';
                        }
                        items[i].datas[PATTERN_NAME_ITEMS[7].cd] = wkcode; // 所属はコード
                        items[i].datas[PATTERN_NAME_ITEMS[8].label] = wkname; // 所属は名称
                        if (wkcode !== '' && wkname !== '') {
                            items[i].datas[SELECTTYPE_NAME_ITEMS[3].cd] = '[' + wkcode + ']' + wkname;
                        } else {
                            items[i].datas[SELECTTYPE_NAME_ITEMS[3].cd] = '';
                        }
                        // 副担当者所属
                        if (utils.common.containsKey(rec, ORG_ITEM[1]) && Array.isArray(rec[ORG_ITEM[1]].value) && rec[ORG_ITEM[1]].value.length > 0) {
                            wkcode = rec[ORG_ITEM[1]].value[0].code;
                            wkname = rec[ORG_ITEM[1]].value[0].name;
                        } else {
                            wkcode = '';
                            wkname = '';
                        }
                        items[i].datas[PATTERN_NAME_ITEMS[9].cd] = wkcode; // 所属はコード
                        items[i].datas[PATTERN_NAME_ITEMS[10].label] = wkname; // 所属は名称
                        if (wkcode !== '' && wkname !== '') {
                            items[i].datas[SELECTTYPE_NAME_ITEMS[4].cd] = '[' + wkcode + ']' + wkname;
                        } else {
                            items[i].datas[SELECTTYPE_NAME_ITEMS[4].cd] = '';
                        }

                        i++;
                    });
                    STATE.listData.datas = items;
                    STATE.itemLength = STATE.listData.items.length;
                    // 各配列の末尾に担当者・副担当者データを追加
                    /*STATE.listData.datas.forEach((item) => {
                        if (item.datas['担当者'] !== undefined) {
                            item.datas['担当者'] = item.datas['担当者'];
                        }
                        if (item.datas['副担当者'] !== undefined) {
                            item.datas['元副担当者'] = item.datas['副担当者'];
                        }
                    });*/
                    console.log('records:', records);
                } catch (e) {
                    console.log('項目取得失敗！:onMounted:', e);
                }
            });

            return {
                STATE,
                CONF,
                selectedStaffName,
                customFilter,
                addPattern,
                openPattern,
                filteredRows,
                getUniqueOptions,
                setNewLabel,
                makeNewItemName,
                isVisibleItem,
                isVisibleLabel,
                isSelectType,
                isSelectData,
                getSelectedStaff,
                setNo,
                changeStaff,
                //patternName,
            };
        },
        template: /* HTML */ `
            <ul>
                <li>顧客一覧のテーブル（tableFieldsのフィールド）と担当者フィールド（staffFieldのフィールド）</li>
                <li>選択したパターンの担当者（staffFieldの分だけ用意）</li>
                <li>現在と表示中パターンの担当者の顧客数・所属組織の顧客数※複数組織に所属している場合は要検討</li>
                <li>適用した際は必ず適用日時と適用前のバックアップを取得・JSONに保存</li>
            </ul>
            <div>
                CONF：
                <pre>{{ CONF }}</pre>
            </div>
            <div id="bz_header">
                <button @click="addPattern" class="bz_bt_def">パターン追加</button>
                <button @click="openPattern" class="bz_bt_def">パターン開く</button>
            </div>
            <div id="bz_events_main_container">
                <table class="bz_table_def">
                    <thead>
                        <pattern-set :pattern="STATE.patternNames.names" :colspan="STATE.listData.items?STATE.listData.items.length-(4*STATE.patternNames.len)-2:0" />
                        <tr>
                            <!--{{STATE.listData.items?STATE.listData.items.length:''}}:{{STATE.listData.items?STATE.patternNames.len:''}}-->
                            <template v-for="field in STATE.listData.items" :key="field">
                                <th v-if="isVisibleLabel(field.label)">
                                    <div>{{ setNewLabel(field.label) }}</div>
                                    <div>
                                        <!-- 追加したあと、データにすべてを設定する -->
                                        <template v-if="!(isSelectType(field.label))">
                                            <input type="text" v-model="STATE.filters[field.code]" />
                                        </template>
                                        <template v-else>
                                            <select v-model="STATE.filters[field.code]">
                                                <option value="">すべて</option>
                                                <option v-for="option in getUniqueOptions(field.code)" :key="option.value" :value="option.value">{{ option.label }}</option>
                                                <option value="__EMPTY__">未設定</option>
                                            </select>
                                        </template>
                                    </div>
                                </th>
                            </template>
                        </tr>
                    </thead>

                    <tbody>
                        <template v-for="(field,index) in filteredRows" :key="field">
                            <tr>
                                <template v-for="(key,itemIndex) in STATE.listData.items" :key="key">
                                    <td v-if="isVisibleItem(key.code)">
                                        <!--{{makeNewItemName(key.code)!==''?makeNewItemName(key.code).nm:''}}:-->
                                        <template v-if="isSelectData(key.code)">
                                            <select v-model="field.datas[setNo(itemIndex,key.code)]" @change="changeStaff(index,$event,key.code)">
                                                <!--(index-STATE.itemLength<=1?'1':'2')-->
                                                <!--:filter="customFilter"-->
                                                <!--<option v-for="staff in getSelectedStaff(key.code)" :key="staff" :value="staff">{{ staff }}</option>-->
                                                <option v-for="option in getUniqueOptions(key.code)" :key="option.value" :value="option.label">{{ option.label}}</option>
                                                <option value="">未設定</option>
                                            </select>
                                        </template>
                                        <template v-else> {{field.datas[key.code]}} </template>
                                    </td>
                                </template>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>

            <div style="margin:20px 0;">
                V-selectの例
                <v-select :options="STATE.testData" label="name" v-model="STATE.testSelectedStaff" :filter="customFilter">
                    <template v-slot:no-options="{ search, searching }">
                        <div>担当者が見つかりません</div>
                    </template>
                    <template #option="{ code,name }">
                        <div>［{{ code }}］{{ name }}</div>
                    </template>
                </v-select>
                <div style="margin:20px 0;">選択中コード：{{ STATE.testSelectedStaff?.code }}</div>
                <div style="margin:20px 0;">選択中担当者object：{{ STATE.testSelectedStaff }}</div>
            </div>
        `,
    };

    kintone.events.on('app.record.index.show', function (e) {
        const CONTAINER = document.querySelector(CONTAINER_ID);
        if (!CONTAINER) {
            return e;
        }

        if (!CONFDATA.CONFIG_DATA) {
            Swal.fire({
                icon: 'error',
                title: '設定エラー',
                text: '担当者変更プラグインが未設定です。設定を行ってください。',
            });
            return e;
        }

        const VUE_APP = Vue.createApp(APP);
        VUE_APP.mount(CONTAINER);

        return e;
    });
})(kintone.$PLUGIN_ID);
