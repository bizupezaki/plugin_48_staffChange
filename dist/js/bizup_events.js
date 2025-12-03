/**
 * BIZUP 担当者変更プラグイン
 * Copyright © 2025 Bizup
 */
(function (PLUGIN_ID) {
    ('use strict');

    const CONTAINER_ID = '#bz_update_staffs_container';
    const { ref, reactive, h, computed, onMounted, nextTick } = Vue;

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
    const PATTERN_TITLE_COLOR = ['#FFFF00', '#64D2F0', '#92D050']; // パターンタイトルカラー
    const PATTERN_ITEMS_COLOR = ['#FFF2CC', '#DDEBF7', '#E2EFDA']; // 担当者選択カラー
    const CUSTOMER_CHANGE_BACKCOLOR = '#FFC000'; // 項目相違カラー
    const CUSTOMER_CHANGE_FONTCOLOR = '#FF0000'; // 非表示がオン　または　退社日が設定されている場合のカラー
    const CUSTOMER_NOCHANGE_COLOR = '#FFFFFF'; // 通常カラー

    // console.log(CONF);

    // 担当者マスタのフィールド定義（appID:93）
    const STAFFMASTER_FIELD = {
        id: { readCd: '$id', writeCd: 'id', type: '__ID__', name: '' },
        revision: { readCd: '$revision', writeCd: 'revision', type: '__REVISION__', name: '' },
        staff: { cd: '担当者名', type: 'SINGLE_LINE_TEXT', name: '担当者名' },
        staffCode: { cd: '担当者コード', type: 'SINGLE_LINE_TEXT', name: '担当者コード' },
        kintoneAccount: { cd: 'ユーザー', type: 'USER_SELECT', name: 'kintoneアカウント' },
        approverAccount: { cd: '承認上長アカウント', type: 'USER_SELECT', name: '承認上長アカウント' },
        hireDate: { cd: '入社日', type: 'DATE', name: '入社日' },
        retireDate: { cd: '退社日', type: 'DATE', name: '退社日' },
        facility: { cd: '施設・備品', type: 'CHECK_BOX', name: '施設・設備' },
        organization: { cd: '組織選択', type: 'ORGANIZATION_SELECT', name: '所属' },
        hiddenFlag: { cd: '非表示フラグ', type: 'CHECK_BOX', name: '非表示フラグ', value: ['ON'] },
    };

    // 顧客カルテのフィールド定義（appID:85）
    const CUSTOMERCHART_FIELD = {
        id: { readCd: '$id', writeCd: 'id', type: '__ID__', name: '' },
        revision: { readCd: '$revision', writeCd: 'revision', type: '__REVISION__', name: '' },
        staff: { cd: '担当者', type: 'SINGLE_LINE_TEXT', name: '担当者' },
        subStaff: { cd: '副担当者', type: 'SINGLE_LINE_TEXT', name: '副担当者' },
        fiscalMonth: { cd: 'ドロップダウン_決算月', type: 'DROP_DOWN', name: '決算月' },
        staffChangeHistoryTable: { cd: '担当者変更履歴テーブル', type: 'SUBTABLE', name: '担当者変更履歴テーブル' },
        changeDate: { cd: '担当者変更日', type: 'DATE', name: '担当者変更日' },
        changedBy: { cd: '変更担当', type: 'SINGLE_LINE_TEXT', name: '変更担当' },
        previousStaff: { cd: '変更前担当者', type: 'SINGLE_LINE_TEXT', name: '変更前担当者' },
        newStaff: { cd: '変更後担当者', type: 'SINGLE_LINE_TEXT', name: '変更後担当者' },
        changeNote: { cd: '変更履歴備考', type: 'SINGLE_LINE_TEXT', name: '変更履歴備考' },
    };

    // 担当者変更のフィールド定義（appID:324）
    const STAFF_CHANGE_FIELDCD = {
        jsonData: { cd: 'JSON', type: 'MULTI_LINE_TEXT', name: 'JSON' },
        patternName: { cd: 'パターン名', type: 'SINGLE_LINE_TEXT', name: 'パターン名' },
        appliedDate: { cd: '適用日', type: 'DATETIME', name: '適用日' },
        executor: { cd: '実行者', type: 'SINGLE_LINE_TEXT', name: '実行者' },
        id: { readCd: '$id', writeCd: 'id', type: '__ID__', name: '' },
        revision: { readCd: '$revision', writeCd: 'revision', type: '__REVISION__', name: '' },
        modifier: { cd: '更新者', type: 'MODIFIER', name: '更新者' },
        updatedTime: { cd: '更新日時', type: 'UPDATED_TIME', name: '更新日時' },
        createdTime: { cd: '作成日時', type: 'CREATED_TIME', name: '作成日時' },
        isVisible: { cd: '非表示フラグ', type: 'CHECK_BOX', name: '非表示フラグ' },
    };

    // パターン追加テーブル
    const setPattern = {
        props: ['pattern', 'colspan'],
        emits: ['savePattern', 'replaceAllPattern', 'applyCustomerChartPattern', 'showBackupPattern', 'restoreBackupPattern'],
        template: `
            <tr v-if="pattern && pattern.length!==0">
                <th :colspan="colspan"></th>
                <th v-for="(item,index) in pattern" :key="index" :colspan="item.colspan" :style="{ backgroundColor: item.titleColor }">
                        {{item.name}} 
                        <button @click="replaceAll(item)" class="bz_bt_def">担当者一括置換</button>
                        <button @click="save(item)" class="bz_bt_def">この設定を保存</button>
                        <button @click="apply(item)" class="bz_bt_def">顧客カルテに適用</button>
                        <button @click="showBackup(item)" class="bz_bt_def">バックアップ表示</button>
                        <template v-if="item.backupDispFlg">
                            <button @click="restoreBackup(item)" class="bz_bt_def">バックアップを復元</button>
                        </template>
                </th>
            </tr>
        `,
        methods: {
            save(item) {
                this.$emit('savePattern', item, '', '', 0);
            },
            replaceAll(item) {
                this.$emit('replaceAllPattern', item);
            },
            apply(item) {
                this.$emit('applyCustomerChartPattern', item);
            },
            showBackup(item) {
                this.$emit('showBackupPattern', item);
            },
            restoreBackup(item) {
                this.$emit('restoreBackupPattern', item);
            },
        },
    };

    // v-select
    /*const setVselect = {
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
    };*/
    // vuer application
    const APP = {
        components: {
            'pattern-set': setPattern,
            //'v-select': window['vue-select'], // 外部ライブラリ
        },
        setup() {
            const STATE = reactive({
                /*testData: [
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
                ],*/
                listData: {},
                //listDataPattern: { clickNo: null, datas: [], clickName: '' },
                listDataPattern: [], // パターン一覧のデータ
                patternNames: { len: 0, maxlength: MAX_PATTERN, names: [] }, // 選択したパターン
                selectStaffs: [], // 担当者マスタの全データ
                testSelectedStaff: null, // v-select用
                filters: {}, // 絞り込み条件
                itemLength: 0, // 表示項目数
                listTotal: {}, // 集計データ
            });

            // 項目名除外
            const EXCEPT_ITEMS = ['$id', '$revision'];
            // 所属
            const ORG_ITEM = ['チーム', '副チーム'];

            // パターン名登録項目（コードと名称をひとつにした場合、別々にデータも保持するために持っている）
            // データが汚すぎる→下のコード＋名称とくっつけて、綺麗に一つにしたいが・・・
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
                { cd: '決算月', label: '', type: '', visible: false },
            ];

            // コードと名称をひとつにまとめたいが・・・
            const SELECTTYPE_NAME_ITEMS = [
                { cd: '担当者コード名', type: '', label: ' 担当者名', index: 1 },
                { cd: '副担当者コード名', type: '', label: ' 副担当者名', index: 3 },
                { cd: '顧客コード名', type: '', label: '顧客名', index: 0 },
                { cd: '担当者所属コード名', type: '', label: '担当者所属', index: 2 },
                { cd: '副担当者所属コード名', type: '', label: '副担当者所属', index: 4 },
            ];

            // selectの空の値（未設定用）
            const EMPTY_VALUE = '__EMPTY__';

            const CONF = CONFDATA.CONFIG_DATA ? JSON.parse(CONFDATA.CONFIG_DATA) : '';

            // 本日日付
            let DateTime = luxon.DateTime;
            luxon.Settings.defaultLocale = 'ja';
            const TODAY = DateTime.local().startOf('day'); // 1日の始め

            /**
             * 担当者、所属決算月ごとの集計
             * @returns {array} totalData 集計データ
             */
            const totalStaff = computed(() => {
                let totalData = [];
                // 空の配列を用意
                let patStaffList = Array.from({ length: STATE.patternNames.len }, () => []);
                let patOrgList = Array.from({ length: STATE.patternNames.len }, () => []);

                STATE.listData.datas.forEach((item) => {
                    const fiscalMonth = parseInt(item.datas[CUSTOMERCHART_FIELD.fiscalMonth.cd]) || 0; // 決算月

                    for (let i = 0; i < STATE.patternNames.len; i++) {
                        const pattern = STATE.patternNames.names[i];
                        // 各パターンごとの集計処理

                        // 項目名取得
                        let itemCode = PATTERN_NAME_ITEMS[1].cd; // 担当者コード
                        let itemName = PATTERN_NAME_ITEMS[2].cd; // 担当者名
                        const staffCode = item.datas['pattern'][pattern.index - 1][itemCode]; // 担当者コード
                        const staffName = item.datas['pattern'][pattern.index - 1][itemName]; // 担当者名

                        itemCode = PATTERN_NAME_ITEMS[7].cd; // 担当者コード
                        itemName = PATTERN_NAME_ITEMS[8].cd; // 担当者名
                        const orgCode = item.datas['pattern'][pattern.index - 1][itemCode]; // 担当者コード
                        const orgName = item.datas['pattern'][pattern.index - 1][itemName]; // 担当者名

                        // 担当者データを検索
                        let matchDataStaff = patStaffList[i].find((data) => data.code === staffCode);
                        if (matchDataStaff) {
                            // 既存担当者の場合、該当月のカウントを増やす
                            let monthData = matchDataStaff.datas.find((d) => d.month === fiscalMonth);
                            if (monthData) {
                                monthData.count++;
                            } else {
                                matchDataStaff.datas.push({ month: fiscalMonth, count: 1 });
                            }
                        } else {
                            // 新規担当者の場合、新しいエントリを作成
                            patStaffList[i].push({
                                code: staffCode,
                                name: staffName,
                                datas: [{ month: fiscalMonth, count: 1 }],
                            });
                        }

                        // 所属データを検索
                        let matchDataOrg = patOrgList[i].find((data) => data.code === orgCode);
                        if (matchDataOrg) {
                            // 既存担当者の場合、該当月のカウントを増やす
                            let monthData = matchDataOrg.datas.find((d) => d.month === fiscalMonth);
                            if (monthData) {
                                monthData.count++;
                            } else {
                                matchDataOrg.datas.push({ month: fiscalMonth, count: 1 });
                            }
                        } else {
                            // 新規担当者の場合、新しいエントリを作成
                            patOrgList[i].push({
                                code: orgCode,
                                name: orgName,
                                datas: [{ month: fiscalMonth, count: 1 }],
                            });
                        }
                    }
                });
                totalData = { staff: patStaffList, org: patOrgList };
                //console.log('patStaffList:', patStaffList);
                //console.log('totalData:', totalData);
                return totalData;
            });

            /*const selectedStaffName = computed(() => {
                if (!STATE.testSelectedStaff) return '';
                const staff = STATE.testData.find((s) => s.code === STATE.testSelectedStaff);
                return staff ? staff.name : '';
            });*/

            /**
             * v-select用フィルタ
             * @param {object} options 取得フィールド(選択されたもの)
             * @param {string} label ユーザが入力した文字
             * @param {string} itemText getOptionLabel(option)の結果（表示ラベル）
             * @returns {array} フィルタリングされたオプション
             */
            /*function customFilter(options, label, itemText) {
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
            }*/

            /**
             * 検索
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
                    throw error;
                }
            };

            /**
             * 新規追加
             * @param {array} data 登録データ
             * @param {number} appId アプリID
             * @returns {} res レコード
             */
            const insertRecords = async (data, appId) => {
                let res = null;
                try {
                    res = await utils.recordUtils.insertRecords(data, appId);
                    if (res.length === 0) {
                        console.log(data, ':登録データなし！（insertRecords）', res);
                    } else {
                        console.log(data, ':登録完了！（insertRecords）', res);
                    }
                    return res;
                } catch (error) {
                    console.error('insertRecords:', error);
                    throw error;
                }
            };

            /**
             * 更新
             * @param {array} data 更新データ
             * @param {number} appId アプリID
             * @returns {} res レコード
             */
            const updateRecords = async (data, appId) => {
                console.log('updateData');

                let res = null;
                try {
                    res = await utils.recordUtils.updateRecords(data, appId);
                    if (res.length === 0) {
                        //console.log(jyoken, ':該当データなし！');
                        console.log(data, ':該当データなし！（updateRecords）', res);
                    } else {
                        console.log(data, ':更新完了！（updateRecords）', res);
                    }
                    return res;
                } catch (error) {
                    console.error('updateRecords:', error);
                    throw error;
                }
            };

            /**
             * 未入力チェック
             * @param {String} value
             * @param {string} label 項目名
             * @returns {String} エラーメッセージ
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
             * @returns {object}
             */
            const showConfirmSwal = async ({ title, text, inputType = 'text', inputValidator, inputValue = '', confirmButtonText = 'OK', cancelButtonText = 'キャンセル' }) => {
                try {
                    const result = await Swal.fire({
                        title: title,
                        text: text,
                        input: inputType || undefined, // 'text', 'email', 'number', 'password', 'textarea', 'select', 'radio', 'checkbox', 'file'
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
                        title: 'パターンの最大数超過',
                        text: '追加できるパターンは最大' + MAX_PATTERN + 'つまでです。',
                        icon: 'warning',
                        confirmButtonText: '閉じる',
                    });
                    return;
                }

                // 入力画面表示
                const result = await showConfirmSwal({
                    title: '新規パターン追加',
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
                let ref = null;
                try {
                    ref = await insertRecords([insertData], utils.constants.THIS_APP_ID);
                } catch (error) {
                    console.error('パターン追加に失敗しました。', error.error);
                    //error.error.headers['x-cybozu-error']
                    //const headerCode = error.error?.headers?.['x-cybozu-error'];
                    Swal.fire({
                        title: 'パターンの追加失敗',
                        text: 'パターンの追加に失敗しました。',
                        icon: 'error',
                        confirmButtonText: '閉じる',
                    });
                }

                // 追加したパターンを一覧に表示
                let cnt = STATE.patternNames.len + 1;
                const staff = [SELECTTYPE_NAME_ITEMS[0].cd, PATTERN_NAME_ITEMS[1].cd, PATTERN_NAME_ITEMS[2].cd];
                const subStaff = [SELECTTYPE_NAME_ITEMS[1].cd, PATTERN_NAME_ITEMS[3].cd, PATTERN_NAME_ITEMS[4].cd];
                const department = [SELECTTYPE_NAME_ITEMS[3].cd, PATTERN_NAME_ITEMS[7].cd, PATTERN_NAME_ITEMS[8].cd];
                const subDepartment = [SELECTTYPE_NAME_ITEMS[4].cd, PATTERN_NAME_ITEMS[9].cd, PATTERN_NAME_ITEMS[10].cd];

                STATE.listData.items.push({ code: '新_' + SELECTTYPE_NAME_ITEMS[0].cd + '_' + cnt, label: SELECTTYPE_NAME_ITEMS[0].label, type: '' });
                STATE.listData.items.push({ code: '新_' + SELECTTYPE_NAME_ITEMS[3].cd + '_' + cnt, label: SELECTTYPE_NAME_ITEMS[3].label, type: '' });
                STATE.listData.items.push({ code: '新_' + SELECTTYPE_NAME_ITEMS[1].cd + '_' + cnt, label: SELECTTYPE_NAME_ITEMS[1].label, type: '' });
                STATE.listData.items.push({ code: '新_' + SELECTTYPE_NAME_ITEMS[4].cd + '_' + cnt, label: SELECTTYPE_NAME_ITEMS[4].label, type: '' });

                // 現役の担当者取得
                const staffsCode = STATE.selectStaffs.map((s) => s[STAFFMASTER_FIELD.staffCode.cd]);
                // 所属コードのみ取得
                //const departmentsCode = STATE.selectStaffs.map((s) => s[STAFFMASTER_FIELD.organization.cd]).map((s) => s[0].code);

                const updatedArrays = STATE.listData.datas.reduce((acc, item) => {
                    // 担当者コードと所属名は対になっているはずなので、担当者コードで現役かどうかをチェック
                    const idxS1 = staffsCode.indexOf(item.datas[PATTERN_NAME_ITEMS[1].cd]); // 担当者コード
                    const idxS2 = staffsCode.indexOf(item.datas[PATTERN_NAME_ITEMS[3].cd]); // 副担当者コード

                    const wk = {
                        index: cnt,
                        [staff[0]]: idxS1 !== -1 ? item.datas[SELECTTYPE_NAME_ITEMS[0].cd] : '', // 担当者
                        [staff[1]]: idxS1 !== -1 ? item.datas[PATTERN_NAME_ITEMS[1].cd] : '',
                        [staff[2]]: idxS1 !== -1 ? item.datas[PATTERN_NAME_ITEMS[2].cd] : '',
                        //[wkStaff]: idxS1 !== -1 ? item.datas[SELECTTYPE_NAME_ITEMS[0].cd] : '', // 選択値保存用

                        [subStaff[0]]: idxS2 !== -1 ? item.datas[SELECTTYPE_NAME_ITEMS[1].cd] : '', // 副担当者
                        [subStaff[1]]: idxS2 !== -1 ? item.datas[PATTERN_NAME_ITEMS[3].cd] : '',
                        [subStaff[2]]: idxS2 !== -1 ? item.datas[PATTERN_NAME_ITEMS[4].cd] : '',
                        //[wkSubStaff]: idxS2 !== -1 ? item.datas[SELECTTYPE_NAME_ITEMS[1].cd] : '',

                        [department[0]]: idxS1 !== -1 ? item.datas[SELECTTYPE_NAME_ITEMS[3].cd] : '', // 担当者所属
                        [department[1]]: idxS1 !== -1 ? item.datas[PATTERN_NAME_ITEMS[7].cd] : '',
                        [department[2]]: idxS1 !== -1 ? item.datas[PATTERN_NAME_ITEMS[8].cd] : '',
                        //[wkDepartment]: idxS1 !== -1 ? item.datas[SELECTTYPE_NAME_ITEMS[3].cd] : '',

                        [subDepartment[0]]: idxS2 !== -1 ? item.datas[SELECTTYPE_NAME_ITEMS[4].cd] : '', // 副担当者所属
                        [subDepartment[1]]: idxS2 !== -1 ? item.datas[PATTERN_NAME_ITEMS[9].cd] : '',
                        [subDepartment[2]]: idxS2 !== -1 ? item.datas[PATTERN_NAME_ITEMS[10].cd] : '',
                        //[wkSubDepartment]: idxS2 !== -1 ? item.datas[SELECTTYPE_NAME_ITEMS[4].cd] : '',
                    };

                    const updatedItem = {
                        ...item,
                        datas: {
                            ...item.datas,
                            ['pattern']: [...(item.datas['pattern'] || []), wk],
                        },
                    };
                    acc.push(updatedItem);
                    return acc;
                }, []);
                STATE.listData.datas = updatedArrays;

                STATE.patternNames.names.push({
                    index: cnt,
                    name: result,
                    id: ref.records[0].id,
                    revision: ref.records[0].revision,
                    titleColor: PATTERN_TITLE_COLOR[cnt - 1],
                    itemsColor: PATTERN_ITEMS_COLOR[cnt - 1],
                    backupDispFlg: false,
                    colspan: 4, // 項目数
                });

                // アイテムカラーを追加
                STATE.patternNames.len = cnt;

                // 絞込追加
                STATE.filters['新_' + SELECTTYPE_NAME_ITEMS[0].cd + '_' + cnt] = '';
                STATE.filters['新_' + SELECTTYPE_NAME_ITEMS[1].cd + '_' + cnt] = '';
                STATE.filters['新_' + SELECTTYPE_NAME_ITEMS[3].cd + '_' + cnt] = '';
                STATE.filters['新_' + SELECTTYPE_NAME_ITEMS[4].cd + '_' + cnt] = '';

                // stickyヘッダー対応
                nextTick(() => {
                    bizupUtil.common.setStickyHeaderHeight(CONTAINER_ID, '');
                });
            };

            /**
             * パターン開く
             * @param {array} selectedPatterns 選択パターン（再表示の際に設定するinputのデータ）
             */
            const openPattern = async (selectedPatterns) => {
                // 初期化
                STATE.listDataPattern = [];

                // 非表示フラグがON以外のパターンを取得
                try {
                    const condition = [STAFF_CHANGE_FIELDCD.isVisible.cd] + ' not in ("ON")';
                    const records = await getRecords([], condition, '', utils.constants.THIS_APP_ID);
                    //console.log('openPattern取得結果:', records);
                    // 取得したデータをSwalを使って、表で表示する
                    if (!records || records.length === 0) {
                        Swal.fire({
                            title: '取得データーなし',
                            text: 'パターンデータがありません',
                            //width: '60%',
                            confirmButtonText: '閉じる',
                        });
                        return;
                    }

                    // 画面表示
                    const key = STAFF_CHANGE_FIELDCD.patternName.cd;
                    const label = STAFF_CHANGE_FIELDCD.patternName.name;
                    const modifier = STAFF_CHANGE_FIELDCD.modifier.name;
                    const updatedTime = STAFF_CHANGE_FIELDCD.updatedTime.name;
                    const createdTime = STAFF_CHANGE_FIELDCD.createdTime.name;

                    let patterns = [];
                    let style = `<style>
                        .swal2-html-container {
                            padding-top:0 !important;
                        }
                    </style>`;
                    let tableHtml = '<div style=""><table id="patternTable" style="width:100%; border: none; border-collapse: separate;">';
                    tableHtml += '<thead><tr>';
                    tableHtml += `<th style="position: sticky; top: 0; border-collapse: separate; border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; text-align: center;">選択</th>`;
                    tableHtml += `<th style="position: sticky; top: 0; border-collapse: separate; border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; text-align: center;">${label}</th>`;
                    tableHtml += `<th style="position: sticky; top: 0; border-collapse: separate; border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; text-align: center;">${createdTime}</th>`;
                    tableHtml += `<th style="position: sticky; top: 0; border-collapse: separate; border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; text-align: center;">${updatedTime}</th>`;
                    tableHtml += `<th style="position: sticky; top: 0; border-collapse: separate; border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; text-align: center;">${modifier}</th>`;
                    tableHtml += '</tr></thead>';
                    tableHtml += '<tbody>';
                    records.forEach((rec, index) => {
                        tableHtml += '<tr style="cursor: pointer;">';
                        const wkname = rec[key]?.value ?? '';
                        let wkcreated = rec[STAFF_CHANGE_FIELDCD.createdTime.cd]?.value ?? '';
                        let dt = luxon.DateTime.fromJSDate(new Date(wkcreated));
                        wkcreated = dt.toFormat('yyyy年MM月dd日 HH:mm');
                        let wkupdated = rec[STAFF_CHANGE_FIELDCD.updatedTime.cd]?.value ?? '';
                        dt = luxon.DateTime.fromJSDate(new Date(wkupdated));
                        wkupdated = dt.toFormat('yyyy年MM月dd日 HH:mm');
                        let wkmodifier = rec[STAFF_CHANGE_FIELDCD.modifier.cd]?.value?.name ?? '';
                        let wkId = rec['$id']?.value ?? '';
                        tableHtml += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;"><input type="checkbox" name="patternSelect" style="cursor: pointer;" value="${index}" data-pattern-id="${wkId}"></td>`;
                        tableHtml += `<td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${wkname}</td>`;
                        tableHtml += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${wkcreated}</td>`;
                        tableHtml += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${wkupdated}</td>`;
                        tableHtml += `<td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${wkmodifier}</td>`;
                        tableHtml += '</tr>';

                        // JSONデータを取得
                        patterns.push({ name: rec[key].value, jsonData: rec[STAFF_CHANGE_FIELDCD.jsonData.cd]?.value ?? '', id: rec[EXCEPT_ITEMS[0]].value, revision: rec[EXCEPT_ITEMS[1]].value });
                    });
                    tableHtml += '</tbody></table></div>';
                    tableHtml += '<input type="hidden" id="clickName" name="clickName" value="">';
                    const result = await Swal.fire({
                        title: 'パターン一覧',
                        html: style + tableHtml,
                        showCancelButton: true,
                        showDenyButton: true,
                        confirmButtonText: '開く',
                        denyButtonText: '非表示にする',
                        cancelButtonText: 'キャンセル',
                        //inputValidator: (value) => validatorRow(value),
                        didOpen: () => {
                            setupRowClickHighlighting('patternTable', selectedPatterns);
                        },
                        preConfirm: () => {
                            // 開くボタン押下時
                            if (STATE.listDataPattern.length <= 0) {
                                Swal.showValidationMessage('パターンを選択してください');
                                return false;
                            }
                            if (STATE.listDataPattern.length > 3) {
                                Swal.showValidationMessage('追加できるパターンは最大' + MAX_PATTERN + 'つまでです。');
                                return false;
                            }
                            if (STATE.patternNames.len + STATE.listDataPattern.length > MAX_PATTERN) {
                                Swal.showValidationMessage('追加できるパターンは最大' + MAX_PATTERN + 'つまでです。<br>現在のパターン数：' + STATE.patternNames.len + 'つ　選択したパターン数：' + STATE.listDataPattern.length + 'つ');
                                return false;
                            }
                        },
                        preDeny: () => {
                            // 非表示にするボタン押下時
                            if (STATE.listDataPattern.length <= 0) {
                                Swal.showValidationMessage('パターンを選択してください');
                                return false;
                            }
                        },
                        width: '60%',
                    });

                    if (result.isDismissed) {
                        // キャンセルの場合
                        return;
                    }

                    if (result.isDenied) {
                        // 非表示にするの場合
                        console.log('パターンを非表示にする処理');

                        // チェックボックスの内容を保存
                        const checkboxes = document.querySelectorAll('input[name="patternSelect"]:checked');
                        const selectedPatterns = Array.from(checkboxes).map((checkbox) => {
                            return { index: parseInt(checkbox.value), id: checkbox.getAttribute('data-pattern-id') };
                        });

                        Swal.close(); // いったん閉じる
                        setTimeout(async () => {
                            const confirmResult = await Swal.fire({
                                title: '確認',
                                text: '選択したパターンを非表示にしてよいですか？',
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonText: 'はい',
                                cancelButtonText: 'いいえ',
                            });
                            if (confirmResult.isConfirmed) {
                                // レコード更新
                                const updateData = selectedPatterns.map((pattern) => {
                                    return {
                                        [STAFF_CHANGE_FIELDCD.id.writeCd]: pattern.id,
                                        //[STAFF_CHANGE_FIELDCD.id.writeCd]: 1000,  // テスト用
                                        [STAFF_CHANGE_FIELDCD.revision.writeCd]: patterns[pattern.index].revision,
                                        //[STAFF_CHANGE_FIELDCD.revision.writeCd]: 9999, // テスト用
                                        record: {
                                            [STAFF_CHANGE_FIELDCD.isVisible.cd]: {
                                                value: ['ON'],
                                            },
                                        },
                                    };
                                });

                                // チェックボックスのデータ用
                                let wkselectedPatterns = [];
                                try {
                                    await updateRecords(updateData, utils.constants.THIS_APP_ID);
                                } catch (error) {
                                    console.error('パターンの非表示フラグ更新に失敗しました。', error.error);
                                    const errorCode = error.error?.code;
                                    if (errorCode === 'GAIA_CO02') {
                                        await Swal.fire({
                                            title: '非表示フラグ更新失敗',
                                            html: '<div>他のユーザが編集した可能性があります。<br>再度更新を試みてください。</div>',
                                            icon: 'warning',
                                            confirmButtonText: '閉じる',
                                        });
                                    } else {
                                        await Swal.fire({
                                            title: '非表示フラグ更新失敗',
                                            text: 'パターンの非表示フラグ更新に失敗しました。',
                                            icon: 'error',
                                            confirmButtonText: '閉じる',
                                        });
                                    }

                                    // 失敗した場合は選択されたパターンを保持
                                    wkselectedPatterns = selectedPatterns;
                                    //return;
                                }

                                // 画面再表示
                                await openPattern(wkselectedPatterns);
                            }
                            if (confirmResult.isDismissed) {
                                // キャンセルの場合
                                await openPattern(selectedPatterns); // 再度開く
                            }
                        }, 300);
                        return;
                    }

                    // OK処理
                    // 3つより多い場合はエラー
                    if (STATE.patternNames.len >= MAX_PATTERN) {
                        Swal.fire({
                            title: 'パターンの最大数超過',
                            text: '追加できるパターンは最大' + MAX_PATTERN + 'つまでです。',
                            icon: 'warning',
                            confirmButtonText: '閉じる',
                        });
                        return;
                    }

                    STATE.listDataPattern.forEach((pattern, index) => {
                        const jsonData = patterns[STATE.listDataPattern[index].clickNo].jsonData;
                        //console.log('listDataPattern:', STATE.listDataPattern);

                        // データをJSONからオブジェクトに変換してSTATEに保存
                        //const jsonData = STATE.listDataPattern.datas[STATE.listDataPattern.clickNo].jsonData;
                        const clickData = JSON.parse(jsonData);
                        pattern.datas = clickData;
                        //console.log('クリックされた行のデータ:', clickData);

                        // パターン表示
                        let cnt = STATE.patternNames.len + 1;
                        const staff = [SELECTTYPE_NAME_ITEMS[0].cd, PATTERN_NAME_ITEMS[1].cd, PATTERN_NAME_ITEMS[2].cd];
                        const subStaff = [SELECTTYPE_NAME_ITEMS[1].cd, PATTERN_NAME_ITEMS[3].cd, PATTERN_NAME_ITEMS[4].cd];
                        const department = [SELECTTYPE_NAME_ITEMS[3].cd, PATTERN_NAME_ITEMS[7].cd, PATTERN_NAME_ITEMS[8].cd];
                        const subDepartment = [SELECTTYPE_NAME_ITEMS[4].cd, PATTERN_NAME_ITEMS[9].cd, PATTERN_NAME_ITEMS[10].cd];

                        // 項目名設定
                        STATE.listData.items.push({ code: '新_' + SELECTTYPE_NAME_ITEMS[0].cd + '_' + cnt, label: SELECTTYPE_NAME_ITEMS[0].label, type: '' });
                        STATE.listData.items.push({ code: '新_' + SELECTTYPE_NAME_ITEMS[3].cd + '_' + cnt, label: SELECTTYPE_NAME_ITEMS[3].label, type: '' });
                        STATE.listData.items.push({ code: '新_' + SELECTTYPE_NAME_ITEMS[1].cd + '_' + cnt, label: SELECTTYPE_NAME_ITEMS[1].label, type: '' });
                        STATE.listData.items.push({ code: '新_' + SELECTTYPE_NAME_ITEMS[4].cd + '_' + cnt, label: SELECTTYPE_NAME_ITEMS[4].label, type: '' });

                        // 現役の担当者取得
                        const staffsCode = STATE.selectStaffs.map((s) => s[STAFFMASTER_FIELD.staffCode.cd]);

                        // STATE.listData.datasに追加
                        const updatedArray = STATE.listData.datas.reduce((acc, item) => {
                            // JSONデータから該当IDのデータを取得
                            const matched = clickData.find((data) => data['$id'] === item.datas['$id']);
                            // 担当者コードと所属名は対になっているはずなので、担当者コードで現役かどうかをチェック
                            let idxS1 = -1;
                            let idxS2 = -1;
                            if (matched) {
                                idxS1 = staffsCode.indexOf(matched[PATTERN_NAME_ITEMS[1].cd]); // 担当者コード
                                idxS2 = staffsCode.indexOf(matched[PATTERN_NAME_ITEMS[3].cd]); // 副担当者コード
                            }

                            const wk = {
                                index: cnt,
                                [staff[0]]: idxS1 !== -1 ? '[' + matched[PATTERN_NAME_ITEMS[1].cd] + ']' + matched[PATTERN_NAME_ITEMS[2].cd] : '', // 担当者
                                [staff[1]]: idxS1 !== -1 ? matched[PATTERN_NAME_ITEMS[1].cd] : '',
                                [staff[2]]: idxS1 !== -1 ? matched[PATTERN_NAME_ITEMS[2].cd] : '',
                                //[wkStaff]: idxS1 !== -1 ? '[' + matched[PATTERN_NAME_ITEMS[1].cd] + ']' + matched[PATTERN_NAME_ITEMS[2].cd] : '', // 選択値保存用

                                [subStaff[0]]: idxS2 !== -1 ? '[' + matched[PATTERN_NAME_ITEMS[3].cd] + ']' + matched[PATTERN_NAME_ITEMS[4].cd] : '', // 副担当者
                                [subStaff[1]]: idxS2 !== -1 ? matched[PATTERN_NAME_ITEMS[3].cd] : '',
                                [subStaff[2]]: idxS2 !== -1 ? matched[PATTERN_NAME_ITEMS[4].cd] : '',
                                //[wkSubStaff]: idxS2 !== -1 ? '[' + matched[PATTERN_NAME_ITEMS[3].cd] + ']' + matched[PATTERN_NAME_ITEMS[4].cd] : '',

                                //[department[0]]: idxS1 !== -1 ? '[' + matched[PATTERN_NAME_ITEMS[7].cd] + ']' + matched[PATTERN_NAME_ITEMS[8].cd] : '', // 担当者所属
                                [department[0]]: idxS1 !== -1 ? matched[PATTERN_NAME_ITEMS[8].cd] : '', // 担当者所属
                                [department[1]]: idxS1 !== -1 ? matched[PATTERN_NAME_ITEMS[7].cd] : '',
                                [department[2]]: idxS1 !== -1 ? matched[PATTERN_NAME_ITEMS[8].cd] : '',
                                //[wkDepartment]: idxS1 !== -1 ? '[' + matched[PATTERN_NAME_ITEMS[7].cd] + ']' + matched[PATTERN_NAME_ITEMS[8].cd] : '',

                                //[subDepartment[0]]: idxS2 !== -1 ? '[' + matched[PATTERN_NAME_ITEMS[9].cd] + ']' + matched[PATTERN_NAME_ITEMS[10].cd] : '', // 副担当者所属
                                [subDepartment[0]]: idxS2 !== -1 ? matched[PATTERN_NAME_ITEMS[10].cd] : '', // 副担当者所属
                                [subDepartment[1]]: idxS2 !== -1 ? matched[PATTERN_NAME_ITEMS[9].cd] : '',
                                [subDepartment[2]]: idxS2 !== -1 ? matched[PATTERN_NAME_ITEMS[10].cd] : '',
                                //[wkSubDepartment]: idxS2 !== -1 ? '[' + matched[PATTERN_NAME_ITEMS[9].cd] + ']' + matched[PATTERN_NAME_ITEMS[10].cd] : '',
                            };
                            const updatedItem = {
                                ...item,
                                datas: {
                                    ...item.datas,
                                    ['pattern']: [...(item.datas['pattern'] || []), wk],
                                },
                            };

                            // バックアップ表示
                            if (matched && matched['OLD']) {
                                //console.log('OLD');
                                updatedItem.datas['pattern'][cnt - 1]['OLD'] = {
                                    ...updatedItem.datas['pattern'][cnt - 1]['OLD'],
                                    [PATTERN_NAME_ITEMS[1].cd]: matched['OLD'][PATTERN_NAME_ITEMS[1].cd],
                                    [PATTERN_NAME_ITEMS[2].cd]: matched['OLD'][PATTERN_NAME_ITEMS[2].cd],
                                    [PATTERN_NAME_ITEMS[3].cd]: matched['OLD'][PATTERN_NAME_ITEMS[3].cd],
                                    [PATTERN_NAME_ITEMS[4].cd]: matched['OLD'][PATTERN_NAME_ITEMS[4].cd],
                                    [PATTERN_NAME_ITEMS[7].cd]: matched['OLD'][PATTERN_NAME_ITEMS[7].cd],
                                    [PATTERN_NAME_ITEMS[8].cd]: matched['OLD'][PATTERN_NAME_ITEMS[8].cd],
                                    [PATTERN_NAME_ITEMS[9].cd]: matched['OLD'][PATTERN_NAME_ITEMS[9].cd],
                                    [PATTERN_NAME_ITEMS[10].cd]: matched['OLD'][PATTERN_NAME_ITEMS[10].cd],
                                    [SELECTTYPE_NAME_ITEMS[0].cd]: matched['OLD'][PATTERN_NAME_ITEMS[1].cd] ? '[' + matched['OLD'][PATTERN_NAME_ITEMS[1].cd] + ']' + matched['OLD'][PATTERN_NAME_ITEMS[2].cd] : '',
                                    [SELECTTYPE_NAME_ITEMS[1].cd]: matched['OLD'][PATTERN_NAME_ITEMS[3].cd] ? '[' + matched['OLD'][PATTERN_NAME_ITEMS[3].cd] + ']' + matched['OLD'][PATTERN_NAME_ITEMS[4].cd] : '',
                                    [SELECTTYPE_NAME_ITEMS[3].cd]: matched['OLD'][PATTERN_NAME_ITEMS[8].cd] ? matched['OLD'][PATTERN_NAME_ITEMS[8].cd] : '',
                                    [SELECTTYPE_NAME_ITEMS[4].cd]: matched['OLD'][PATTERN_NAME_ITEMS[10].cd] ? matched['OLD'][PATTERN_NAME_ITEMS[10].cd] : '',
                                };
                            }
                            acc.push(updatedItem);
                            return acc;
                        }, []);
                        STATE.listData.datas = updatedArray;

                        // パターン追加
                        STATE.patternNames.names.push({
                            index: cnt,
                            name: pattern.clickName,
                            id: patterns[pattern.clickNo].id,
                            revision: patterns[pattern.clickNo].revision,
                            titleColor: PATTERN_TITLE_COLOR[cnt - 1],
                            itemsColor: PATTERN_ITEMS_COLOR[cnt - 1], // アイテムカラーを追加
                            backupDispFlg: false,
                            colspan: 4, // 項目数
                        });
                        STATE.patternNames.len = cnt;

                        // 絞込追加
                        STATE.filters['新_' + SELECTTYPE_NAME_ITEMS[0].cd + '_' + cnt] = '';
                        STATE.filters['新_' + SELECTTYPE_NAME_ITEMS[1].cd + '_' + cnt] = '';
                        STATE.filters['新_' + SELECTTYPE_NAME_ITEMS[3].cd + '_' + cnt] = '';
                        STATE.filters['新_' + SELECTTYPE_NAME_ITEMS[4].cd + '_' + cnt] = '';
                    });
                } catch (error) {
                    console.error('openPattern取得失敗:', error);
                }
            };

            /**
             * バックアップ表示
             * @param {object} item パターンデータ
             */
            const showBackupPattern = async (item) => {
                const no = item.index - 1; // パターン番号

                // バックアップデータがない場合は何もしない
                if (!STATE.listData.datas[0].datas['pattern'][no].OLD) {
                    Swal.fire({
                        title: 'バックアップデータなし',
                        text: 'バックアップデータがありません。',
                        icon: 'warning',
                        confirmButtonText: '閉じる',
                    });
                    return;
                }

                // すでに表示されている場合は何もしない
                if (STATE.patternNames.names[no].backupDispFlg) {
                    return;
                }

                // 項目名設定
                let newStaff = [];
                newStaff.push({ code: '旧_' + SELECTTYPE_NAME_ITEMS[0].cd + '_' + item.index, label: SELECTTYPE_NAME_ITEMS[0].label + '（バックアップ）', type: '' });
                newStaff.push({ code: '旧_' + SELECTTYPE_NAME_ITEMS[3].cd + '_' + item.index, label: SELECTTYPE_NAME_ITEMS[3].label + '（バックアップ）', type: '' });
                let newStaffsub = [];
                newStaffsub.push({ code: '旧_' + SELECTTYPE_NAME_ITEMS[1].cd + '_' + item.index, label: SELECTTYPE_NAME_ITEMS[1].label + '（バックアップ）', type: '' });
                newStaffsub.push({ code: '旧_' + SELECTTYPE_NAME_ITEMS[4].cd + '_' + item.index, label: SELECTTYPE_NAME_ITEMS[4].label + '（バックアップ）', type: '' });

                const indexStaff = STATE.listData.items.findIndex((it) => it.code === '新_' + SELECTTYPE_NAME_ITEMS[3].cd + '_' + item.index);
                let wkItems = [...STATE.listData.items.slice(0, indexStaff + 1), ...newStaff, ...STATE.listData.items.slice(indexStaff + 1)];
                const indexStaffsub = wkItems.findIndex((it) => it.code === '新_' + SELECTTYPE_NAME_ITEMS[4].cd + '_' + item.index);
                wkItems = [...wkItems.slice(0, indexStaffsub + 1), ...newStaffsub, ...wkItems.slice(indexStaffsub + 1)];
                STATE.listData.items = wkItems;

                // 現役の担当者取得
                //const staffsCode = STATE.selectStaffs.map((s) => s[STAFFMASTER_FIELD.staffCode.cd]);

                // 絞込追加
                STATE.filters['旧_' + SELECTTYPE_NAME_ITEMS[0].cd + '_' + item.index] = '';
                STATE.filters['旧_' + SELECTTYPE_NAME_ITEMS[1].cd + '_' + item.index] = '';
                STATE.filters['旧_' + SELECTTYPE_NAME_ITEMS[3].cd + '_' + item.index] = '';
                STATE.filters['旧_' + SELECTTYPE_NAME_ITEMS[4].cd + '_' + item.index] = '';

                STATE.patternNames.names[no].backupDispFlg = true;
                STATE.patternNames.names[no].colspan = 8; // 項目数
            };

            /**
             * 集計データ作成
             */
            const aggregateData = async () => {
                // 担当者ごとに集計
                let totalStaff = [];
                let totalOrg = [];
                // STATE.listData.datasにある担当者コードごとで決算月ごとにデータの数を集計
                STATE.listData.datas.forEach((item) => {
                    const staffCode = item.datas[PATTERN_NAME_ITEMS[1].cd]; // 担当者コード
                    const staffName = item.datas[PATTERN_NAME_ITEMS[2].cd]; // 担当者名
                    const orgCode = item.datas[PATTERN_NAME_ITEMS[7].cd]; // 担当者所属コード
                    const orgName = item.datas[PATTERN_NAME_ITEMS[8].cd]; // 担当者所属名
                    const fiscalMonth = parseInt(item.datas[CUSTOMERCHART_FIELD.fiscalMonth.cd]) || 0; // 決算月

                    // 既存の担当者データを検索
                    let matchStaff = totalStaff.find((data) => data.code === staffCode);
                    let matchOrg = totalOrg.find((data) => data.code === orgCode);

                    if (matchStaff) {
                        // 既存担当者の場合、該当月のカウントを増やす
                        let monthData = matchStaff.datas.find((d) => d.month === fiscalMonth);
                        if (monthData) {
                            monthData.count++;
                        } else {
                            matchStaff.datas.push({ month: fiscalMonth, count: 1 });
                        }
                    } else {
                        // 新規担当者の場合、新しいエントリを作成
                        totalStaff.push({
                            code: staffCode,
                            name: staffName,
                            datas: [{ month: fiscalMonth, count: 1 }],
                        });
                    }

                    // 所属ごとに集計
                    if (matchOrg) {
                        // 既存所属の場合、該当月のカウントを増やす
                        let monthData = matchOrg.datas.find((d) => d.month === fiscalMonth);
                        if (monthData) {
                            monthData.count++;
                        } else {
                            matchOrg.datas.push({ month: fiscalMonth, count: 1 });
                        }
                    } else {
                        // 新規所属の場合、新しいエントリを作成
                        totalOrg.push({
                            code: orgCode,
                            name: orgName,
                            datas: [{ month: fiscalMonth, count: 1 }],
                        });
                    }
                });
                STATE.listTotal = { staff: totalStaff, org: totalOrg };
            };

            /**
             * バックアップを復元
             * @param {object} item パターンデータ
             */
            const restoreBackupPattern = async (item) => {
                const no = item.index - 1; // パターン番号

                // バックアップデータがない場合は何もしない
                if (!STATE.listData.datas[0].datas['pattern'][no].OLD) {
                    Swal.fire({
                        title: 'バックアップデータなし',
                        text: 'バックアップデータがありません。',
                        icon: 'warning',
                        confirmButtonText: '閉じる',
                    });
                    return;
                }

                // 確認ダイアログを表示
                const result = await Swal.fire({
                    title: 'バックアップを復元',
                    text: '前回適用時（バックアップ取得時）から顧客カルテの担当者を変更している場合、バックアップ復元により個別に変更された担当者も先祖がえりを起こすので十分注意してください。',
                    icon: 'info',
                    showCancelButton: true,
                    confirmButtonText: '復元',
                    cancelButtonText: 'キャンセル',
                });

                if (!result.isConfirmed) {
                    return;
                }

                Swal.fire({
                    title: 'バックアップを復元中...',
                    allowOutsideClick: false, // ポップアップの外をクリックしても、画面を閉じない
                    didOpen: async () => {
                        Swal.showLoading();
                        await applyPatternToChart();
                    },
                });

                // バックアップを顧客カルテに適用
                const applyPatternToChart = async () => {
                    // 更新日時作成
                    luxon.Settings.defaultLocale = 'ja';
                    const updatedAt = luxon.DateTime.now().toUTC().toISO();

                    // 更新者
                    const executor = kintone.getLoginUser().name + '（バックアップ復元）';

                    // バックアップ復元（担当者が変更になったものだけを復元する）
                    // 項目名を取得
                    const staffCode = [PATTERN_NAME_ITEMS[1].cd, PATTERN_NAME_ITEMS[2].cd, SELECTTYPE_NAME_ITEMS[0].cd];
                    const subStaffCode = [PATTERN_NAME_ITEMS[3].cd, PATTERN_NAME_ITEMS[4].cd, SELECTTYPE_NAME_ITEMS[1].cd];
                    const departmentCode = [PATTERN_NAME_ITEMS[7].cd, PATTERN_NAME_ITEMS[8].cd, SELECTTYPE_NAME_ITEMS[3].cd];
                    const subDepartmentCode = [PATTERN_NAME_ITEMS[9].cd, PATTERN_NAME_ITEMS[10].cd, SELECTTYPE_NAME_ITEMS[4].cd];

                    // 更新データ作成
                    const updateList = STATE.listData.datas.filter((data) => data.datas[staffCode[0]] !== data.datas['pattern'][no].OLD[staffCode[0]] || data.datas[subStaffCode[0]] !== data.datas['pattern'][no].OLD[subStaffCode[0]]);
                    const updateData = updateList.map((data) => {
                        return {
                            [CUSTOMERCHART_FIELD.id.writeCd]: data.datas[EXCEPT_ITEMS[0]], // レコードID
                            //[CUSTOMERCHART_FIELD.id.writeCd]: 1000, // レコードID（テスト用）
                            [CUSTOMERCHART_FIELD.revision.writeCd]: data.datas[EXCEPT_ITEMS[1]], // リビジョン
                            record: {
                                //[CUSTOMERCHART_FIELD.staff.cd]: { value: data.datas[staffCode[0]], lookup: true }, // 担当者コード
                                [CUSTOMERCHART_FIELD.staff.cd]: { value: data.datas['pattern'][no].OLD[staffCode[1]], lookup: true }, // 担当者
                                [CUSTOMERCHART_FIELD.subStaff.cd]: { value: data.datas['pattern'][no].OLD[subStaffCode[1]], lookup: true }, // 副担当者
                            },
                        };
                    });

                    // 更新データがない場合、メッセージを表示
                    if (updateData.length === 0) {
                        Swal.hideLoading();
                        console.log('顧客カルテに適用するバックアップデータがありません。');
                        Swal.update({
                            title: '更新データなし',
                            icon: 'info',
                            text: '顧客カルテに適用するバックアップデータがありません。',
                        });
                        return;
                    }

                    // レコード更新
                    // 顧客カルテ更新（バックアップ）
                    let ref = null;
                    try {
                        ref = await updateRecords(updateData, utils.constants.CUSTOMER_APP_ID);
                    } catch (error) {
                        console.error('顧客カルテの適用（バックアップ）に失敗しました。', error.error);
                        const errorCode = error.error?.code;
                        if (errorCode === 'GAIA_CO02') {
                            Swal.hideLoading();
                            Swal.update({
                                title: '顧客カルテの適用失敗（バックアップ）',
                                html: '<div>他のユーザが編集した可能性があります。<br>最新の内容を再表示後、再度適用を試みてください。</div>',
                                icon: 'warning',
                                confirmButtonText: '閉じる',
                            });
                        } else {
                            Swal.hideLoading();
                            Swal.update({
                                title: '顧客カルテの適用失敗（バックアップ）',
                                text: '顧客カルテの更新に失敗しました。',
                                icon: 'error',
                                confirmButtonText: '閉じる',
                            });
                        }
                        return;
                    }

                    // パターン更新
                    try {
                        const save = await savePattern(item, updatedAt, executor, 2);
                    } catch (error) {
                        console.error('パターン更新に失敗しました。', error.error);
                        //error.error.headers['x-cybozu-error']
                        //const headerCode = error.error?.headers?.['x-cybozu-error'];
                        const errorCode = error.error?.code;
                        if (errorCode === 'GAIA_CO02') {
                            Swal.hideLoading();
                            await Swal.fire({
                                title: 'パターンの更新失敗',
                                html: '<div>他のユーザが編集した可能性があります。<br>最新の内容を再表示後、再度適用を試みてください。</div>',
                                icon: 'warning',
                                confirmButtonText: '閉じる',
                            });
                        } else {
                            Swal.hideLoading();
                            await Swal.fire({
                                title: 'パターンの更新失敗',
                                text: 'パターンの更新に失敗しました。',
                                icon: 'error',
                                confirmButtonText: '閉じる',
                                allowOutsideClick: false,
                            });
                        }
                    }

                    // 表示データを更新
                    const updatedArrays = ref.records.reduce((acc, r) => {
                        return acc.map((data) => {
                            if (data.datas[EXCEPT_ITEMS[0]] === r.id) {
                                return {
                                    ...data,
                                    datas: {
                                        ...data.datas,
                                        [EXCEPT_ITEMS[1]]: r.revision,
                                        [PATTERN_NAME_ITEMS[1].cd]: data.datas['pattern'][no]['OLD'][staffCode[0]], // 担当者コード
                                        [PATTERN_NAME_ITEMS[2].cd]: data.datas['pattern'][no]['OLD'][staffCode[1]], // 担当者
                                        [SELECTTYPE_NAME_ITEMS[0].cd]: data.datas['pattern'][no]['OLD'][staffCode[2]], // 担当者コード名

                                        [PATTERN_NAME_ITEMS[7].cd]: data.datas['pattern'][no]['OLD'][departmentCode[0]], // 担当者所属コード
                                        [PATTERN_NAME_ITEMS[8].cd]: data.datas['pattern'][no]['OLD'][departmentCode[1]], // 担当者所属
                                        [SELECTTYPE_NAME_ITEMS[3].cd]: data.datas['pattern'][no]['OLD'][departmentCode[2]], // 担当者所属コード名

                                        [PATTERN_NAME_ITEMS[3].cd]: data.datas['pattern'][no]['OLD'][subStaffCode[0]], // 副担当者コード
                                        [PATTERN_NAME_ITEMS[4].cd]: data.datas['pattern'][no]['OLD'][subStaffCode[1]], // 副担当者
                                        [SELECTTYPE_NAME_ITEMS[1].cd]: data.datas['pattern'][no]['OLD'][subStaffCode[2]], // 副担当者コード名

                                        [PATTERN_NAME_ITEMS[9].cd]: data.datas['pattern'][no]['OLD'][subDepartmentCode[0]], // 副担当者所属コード
                                        [PATTERN_NAME_ITEMS[10].cd]: data.datas['pattern'][no]['OLD'][subDepartmentCode[1]], // 副担当者所属
                                        [SELECTTYPE_NAME_ITEMS[4].cd]: data.datas['pattern'][no]['OLD'][subDepartmentCode[2]], // 副担当者所属コード名
                                    },
                                };
                            } else {
                                return data;
                            }
                        });
                    }, STATE.listData.datas);
                    STATE.listData.datas = updatedArrays;

                    // 担当者ごとに集計
                    aggregateData(item);

                    Swal.close();
                    Swal.fire({
                        toast: true,
                        position: 'top',
                        icon: 'success',
                        title: 'バックアップを復元しました',
                        timer: 3000,
                        timerProgressBar: true,
                        showConfirmButton: false,
                    });
                };
            };

            /**
             * 顧客カルテに適用
             * @param {object} item パターンデータ
             */
            const applyCustomerChartPattern = async (item) => {
                // メッセージを表示
                Swal.fire({
                    title: '顧客カルテに適用中...',
                    allowOutsideClick: false, // ポップアップの外をクリックしても、画面を閉じない
                    didOpen: async () => {
                        Swal.showLoading();
                        await applyPatternToChart();
                    },
                });

                // 顧客カルテにパターンを適用
                const applyPatternToChart = async () => {
                    // データのバックアップ（レコード登録失敗時に元に戻すため）
                    const datas = STATE.listData.datas;

                    // 更新日時作成
                    luxon.Settings.defaultLocale = 'ja';
                    const updatedAt = luxon.DateTime.now().toUTC().toISO();

                    // 更新者
                    const executor = kintone.getLoginUser().name;

                    // 担当者の場合
                    let staff = [];
                    staff[0] = PATTERN_NAME_ITEMS[1].cd; // 担当者コード
                    staff[1] = PATTERN_NAME_ITEMS[2].cd; // 担当者名
                    staff[2] = PATTERN_NAME_ITEMS[7].cd; // 担当者所属コード
                    staff[3] = PATTERN_NAME_ITEMS[8].cd; // 担当者所属名
                    staff[4] = SELECTTYPE_NAME_ITEMS[0].cd; // 担当者コード名
                    staff[5] = SELECTTYPE_NAME_ITEMS[3].cd; // 担当者所属コード名
                    // 副担当者の場合
                    let subStaff = [];
                    subStaff[0] = PATTERN_NAME_ITEMS[3].cd; // 副担当者コード
                    subStaff[1] = PATTERN_NAME_ITEMS[4].cd; // 副担当者名
                    subStaff[2] = PATTERN_NAME_ITEMS[9].cd; // 副担当者所属コード
                    subStaff[3] = PATTERN_NAME_ITEMS[10].cd; // 副担当者所属名
                    subStaff[4] = SELECTTYPE_NAME_ITEMS[1].cd; // 副担当者コード名
                    subStaff[5] = SELECTTYPE_NAME_ITEMS[4].cd; // 副担当者所属コード名

                    const no = item.index - 1; // パターン番号

                    // 以前データをバックアップする
                    STATE.listData.datas.forEach((data) => {
                        // 担当者　副担当者
                        for (let i = 0; i < staff.length; i++) {
                            if (data.datas['pattern'][no]['OLD']) {
                                data.datas['pattern'][no]['OLD'][staff[i]] = data.datas[staff[i]];
                                data.datas['pattern'][no]['OLD'][subStaff[i]] = data.datas[subStaff[i]];
                            } else {
                                data.datas['pattern'][no]['OLD'] = {
                                    [staff[i]]: data.datas[staff[i]],
                                    [subStaff[i]]: data.datas[subStaff[i]],
                                };
                            }
                        }
                    });

                    // 顧客カルテ更新（担当者が変更になったものだけを更新する）
                    // 項目名を取得
                    const staffCode = [PATTERN_NAME_ITEMS[1].cd, PATTERN_NAME_ITEMS[2].cd, SELECTTYPE_NAME_ITEMS[0].cd];
                    const subStaffCode = [PATTERN_NAME_ITEMS[3].cd, PATTERN_NAME_ITEMS[4].cd, SELECTTYPE_NAME_ITEMS[1].cd];
                    const departmentCode = [PATTERN_NAME_ITEMS[7].cd, PATTERN_NAME_ITEMS[8].cd, SELECTTYPE_NAME_ITEMS[3].cd];
                    const subDepartmentCode = [PATTERN_NAME_ITEMS[9].cd, PATTERN_NAME_ITEMS[10].cd, SELECTTYPE_NAME_ITEMS[4].cd];

                    // 更新データ作成（パターンのデータとバックアップしたデータの比較）
                    const updateList = STATE.listData.datas.filter((data) => data.datas['pattern'][no][staffCode[0]] !== data.datas['pattern'][no].OLD[staff[0]] || data.datas['pattern'][no][subStaffCode[0]] !== data.datas['pattern'][no].OLD[subStaff[0]]);

                    const updateData = updateList.map((data) => {
                        return {
                            [CUSTOMERCHART_FIELD.id.writeCd]: data.datas[EXCEPT_ITEMS[0]], // レコードID
                            //[CUSTOMERCHART_FIELD.id.writeCd]: 1000, // レコードID（テスト用）
                            [CUSTOMERCHART_FIELD.revision.writeCd]: data.datas[EXCEPT_ITEMS[1]], // リビジョン
                            record: {
                                //[CUSTOMERCHART_FIELD.staff.cd]: { value: data.datas[staffCode[0]], lookup: true }, // 担当者コード
                                [CUSTOMERCHART_FIELD.staff.cd]: { value: data.datas['pattern'][no][staffCode[1]], lookup: true }, // 担当者
                                [CUSTOMERCHART_FIELD.subStaff.cd]: { value: data.datas['pattern'][no][subStaffCode[1]], lookup: true }, // 副担当者
                            },
                        };
                    });

                    // 更新データがない場合、メッセージを表示
                    if (updateData.length === 0) {
                        Swal.hideLoading();
                        console.log('顧客カルテに適用する更新データがありません。');
                        Swal.update({
                            title: '更新データなし',
                            icon: 'info',
                            text: '顧客カルテに適用する更新データがありません。',
                        });
                        return;
                    }

                    // レコード更新
                    // 顧客カルテ更新
                    let ref = null;
                    try {
                        ref = await updateRecords(updateData, utils.constants.CUSTOMER_APP_ID);
                    } catch (error) {
                        console.error('顧客カルテの適用に失敗しました。', error.error);
                        //error.error.headers['x-cybozu-error']
                        //const headerCode = error.error?.headers?.['x-cybozu-error'];
                        const errorCode = error.error?.code;
                        if (errorCode === 'GAIA_CO02') {
                            Swal.hideLoading();
                            Swal.update({
                                title: '顧客カルテの適用失敗',
                                html: '<div>他のユーザが編集した可能性があります。<br>最新の内容を再表示後、再度適用を試みてください。</div>',
                                icon: 'warning',
                                confirmButtonText: '閉じる',
                            });
                        } else {
                            Swal.hideLoading();
                            Swal.update({
                                title: '顧客カルテの適用失敗',
                                text: '顧客カルテの更新に失敗しました。',
                                icon: 'error',
                                confirmButtonText: '閉じる',
                            });
                        }

                        // 更新に失敗した場合、データを戻す
                        STATE.listData.datas = datas;
                        return;
                    }

                    // パターン更新
                    try {
                        const save = await savePattern(item, updatedAt, executor, 1);
                    } catch (error) {
                        console.error('パターン更新に失敗しました。', error.error);
                        //error.error.headers['x-cybozu-error']
                        //const headerCode = error.error?.headers?.['x-cybozu-error'];
                        const errorCode = error.error?.code;
                        if (errorCode === 'GAIA_CO02') {
                            Swal.hideLoading();
                            await Swal.fire({
                                title: 'パターンの更新失敗',
                                html: '<div>他のユーザが編集した可能性があります。<br>最新の内容を再表示後、再度適用を試みてください。</div>',
                                icon: 'warning',
                                confirmButtonText: '閉じる',
                            });
                        } else {
                            Swal.hideLoading();
                            await Swal.fire({
                                title: 'パターンの更新失敗',
                                text: 'パターンの更新に失敗しました。',
                                icon: 'error',
                                confirmButtonText: '閉じる',
                                allowOutsideClick: false,
                            });
                        }

                        // 更新に失敗しても、顧客カルテは更新されているので、データは戻さない
                        //STATE.listData.datas = datas;
                        //return;
                    }

                    // 表示データを更新
                    const updatedArrays = ref.records.reduce((acc, r) => {
                        return acc.map((data) => {
                            if (data.datas[EXCEPT_ITEMS[0]] === r.id) {
                                return {
                                    ...data,
                                    datas: {
                                        ...data.datas,
                                        [EXCEPT_ITEMS[1]]: r.revision,
                                        [PATTERN_NAME_ITEMS[1].cd]: data.datas['pattern'][no][staffCode[0]], // 担当者コード
                                        [PATTERN_NAME_ITEMS[2].cd]: data.datas['pattern'][no][staffCode[1]], // 担当者
                                        [SELECTTYPE_NAME_ITEMS[0].cd]: data.datas['pattern'][no][staffCode[2]], // 担当者コード名

                                        [PATTERN_NAME_ITEMS[7].cd]: data.datas['pattern'][no][departmentCode[0]], // 担当者所属コード
                                        [PATTERN_NAME_ITEMS[8].cd]: data.datas['pattern'][no][departmentCode[1]], // 担当者所属
                                        [SELECTTYPE_NAME_ITEMS[3].cd]: data.datas['pattern'][no][departmentCode[2]], // 担当者所属コード名

                                        [PATTERN_NAME_ITEMS[3].cd]: data.datas['pattern'][no][subStaffCode[0]], // 副担当者コード
                                        [PATTERN_NAME_ITEMS[4].cd]: data.datas['pattern'][no][subStaffCode[1]], // 副担当者
                                        [SELECTTYPE_NAME_ITEMS[1].cd]: data.datas['pattern'][no][subStaffCode[2]], // 副担当者コード名

                                        [PATTERN_NAME_ITEMS[9].cd]: data.datas['pattern'][no][subDepartmentCode[0]], // 副担当者所属コード
                                        [PATTERN_NAME_ITEMS[10].cd]: data.datas['pattern'][no][subDepartmentCode[1]], // 副担当者所属
                                        [SELECTTYPE_NAME_ITEMS[4].cd]: data.datas['pattern'][no][subDepartmentCode[2]], // 副担当者所属コード名
                                    },
                                };
                            } else {
                                return data;
                            }
                        });
                    }, STATE.listData.datas);
                    STATE.listData.datas = updatedArrays;

                    // 担当者ごとに集計
                    aggregateData(item);

                    // 完了メッセージ
                    Swal.close();
                    Swal.fire({
                        toast: true,
                        position: 'top',
                        icon: 'success',
                        title: '顧客カルテに適用しました',
                        timer: 3000,
                        timerProgressBar: true,
                        showConfirmButton: false,
                    });
                };
            };

            /**
             * 呼び出し元からパターン保存を分岐
             * @param {object} item パターンオブジェクト
             * @param {string} updatedAt 更新日時
             * @param {string} executor 更新者
             * @param {number} mode 0:新規パターン保存　1:顧客カルテに適用時のパターン更新　2:バックアップ復元時のパターン更新
             */
            const savePattern = async (item, updatedAt, executor, mode) => {
                // パターン保存
                const executePatternSave = async () => {
                    //const item.index;
                    const staff = [PATTERN_NAME_ITEMS[1].cd, PATTERN_NAME_ITEMS[2].cd];
                    const subStaff = [PATTERN_NAME_ITEMS[3].cd, PATTERN_NAME_ITEMS[4].cd];
                    const department = [PATTERN_NAME_ITEMS[7].cd, PATTERN_NAME_ITEMS[8].cd];
                    const subDepartment = [PATTERN_NAME_ITEMS[9].cd, PATTERN_NAME_ITEMS[10].cd];

                    const no = item.index - 1; // パターン番号
                    // JSONに変換
                    const filtered = STATE.listData.datas.map((data) => {
                        const result = {
                            [PATTERN_NAME_ITEMS[0].cd]: data.datas[PATTERN_NAME_ITEMS[0].cd], // $id

                            [PATTERN_NAME_ITEMS[1].cd]: data.datas['pattern'][no][staff[0]], // 担当者
                            [PATTERN_NAME_ITEMS[2].cd]: data.datas['pattern'][no][staff[1]],
                            [PATTERN_NAME_ITEMS[3].cd]: data.datas['pattern'][no][subStaff[0]], // 副担当者
                            [PATTERN_NAME_ITEMS[4].cd]: data.datas['pattern'][no][subStaff[1]],

                            [PATTERN_NAME_ITEMS[7].cd]: data.datas['pattern'][no][department[0]], // 担当者所属
                            [PATTERN_NAME_ITEMS[8].cd]: data.datas['pattern'][no][department[1]],
                            [PATTERN_NAME_ITEMS[9].cd]: data.datas['pattern'][no][subDepartment[0]], // 副担当者所属
                            [PATTERN_NAME_ITEMS[10].cd]: data.datas['pattern'][no][subDepartment[1]],
                        };

                        // バックアップ用フィールドを追加
                        // もともとバックアップ用フィールドがあればその値を、なければnullをセット（未設定は空欄にしたいため）
                        if (result.OLD) {
                        } else {
                            result.OLD = {};
                        }
                        if (data.datas['pattern'][no]['OLD']) {
                            result.OLD[PATTERN_NAME_ITEMS[1].cd] = utils.common.containsKey(data.datas['pattern'][no]['OLD'], PATTERN_NAME_ITEMS[1].cd) ? data.datas['pattern'][no]['OLD'][PATTERN_NAME_ITEMS[1].cd] : null; // 担当者コード
                            result.OLD[PATTERN_NAME_ITEMS[2].cd] = utils.common.containsKey(data.datas['pattern'][no]['OLD'], PATTERN_NAME_ITEMS[2].cd) ? data.datas['pattern'][no]['OLD'][PATTERN_NAME_ITEMS[2].cd] : null; // 担当者名
                            result.OLD[PATTERN_NAME_ITEMS[3].cd] = utils.common.containsKey(data.datas['pattern'][no]['OLD'], PATTERN_NAME_ITEMS[3].cd) ? data.datas['pattern'][no]['OLD'][PATTERN_NAME_ITEMS[3].cd] : null; // 担当者所属コード
                            result.OLD[PATTERN_NAME_ITEMS[4].cd] = utils.common.containsKey(data.datas['pattern'][no]['OLD'], PATTERN_NAME_ITEMS[4].cd) ? data.datas['pattern'][no]['OLD'][PATTERN_NAME_ITEMS[4].cd] : null; // 担当者所属名

                            result.OLD[PATTERN_NAME_ITEMS[7].cd] = utils.common.containsKey(data.datas['pattern'][no]['OLD'], PATTERN_NAME_ITEMS[7].cd) ? data.datas['pattern'][no]['OLD'][PATTERN_NAME_ITEMS[7].cd] : null; // 副担当者コード
                            result.OLD[PATTERN_NAME_ITEMS[8].cd] = utils.common.containsKey(data.datas['pattern'][no]['OLD'], PATTERN_NAME_ITEMS[8].cd) ? data.datas['pattern'][no]['OLD'][PATTERN_NAME_ITEMS[8].cd] : null; // 副担当者名
                            result.OLD[PATTERN_NAME_ITEMS[9].cd] = utils.common.containsKey(data.datas['pattern'][no]['OLD'], PATTERN_NAME_ITEMS[9].cd) ? data.datas['pattern'][no]['OLD'][PATTERN_NAME_ITEMS[9].cd] : null; // 副担当者所属コード
                            result.OLD[PATTERN_NAME_ITEMS[10].cd] = utils.common.containsKey(data.datas['pattern'][no]['OLD'], PATTERN_NAME_ITEMS[10].cd) ? data.datas['pattern'][no]['OLD'][PATTERN_NAME_ITEMS[10].cd] : null; // 副担当者所属名
                        } else {
                            result.OLD[PATTERN_NAME_ITEMS[1].cd] = null; // 担当者コード
                            result.OLD[PATTERN_NAME_ITEMS[2].cd] = null;
                            result.OLD[PATTERN_NAME_ITEMS[3].cd] = null;
                            result.OLD[PATTERN_NAME_ITEMS[4].cd] = null;
                            result.OLD[PATTERN_NAME_ITEMS[7].cd] = null;
                            result.OLD[PATTERN_NAME_ITEMS[8].cd] = null;
                            result.OLD[PATTERN_NAME_ITEMS[9].cd] = null;
                            result.OLD[PATTERN_NAME_ITEMS[10].cd] = null;
                        }

                        return result;
                    });
                    const json = JSON.stringify(filtered, null, 2);
                    const id = item.id;
                    //const id = 1000; // レコードID（テスト用）
                    const revision = item.revision;
                    //const revision = 1; // リビジョン（テスト用）
                    const name = item.name;
                    //console.log('JSON:', json);
                    // レコード更新
                    const updateData = {
                        [STAFF_CHANGE_FIELDCD.id.writeCd]: id,
                        [STAFF_CHANGE_FIELDCD.revision.writeCd]: revision,
                        record: {
                            [STAFF_CHANGE_FIELDCD.jsonData.cd]: { value: json },
                            [STAFF_CHANGE_FIELDCD.patternName.cd]: { value: name },
                            [STAFF_CHANGE_FIELDCD.appliedDate.cd]: { value: updatedAt },
                            [STAFF_CHANGE_FIELDCD.executor.cd]: { value: executor },
                        },
                    };

                    try {
                        const ref = await updateRecords([updateData], utils.constants.THIS_APP_ID);
                        if (ref && ref.records.length > 0) {
                            // STATEのパターン名のrevisionを更新
                            const idx = STATE.patternNames.names.findIndex((p) => p.id === id);
                            if (idx !== -1) {
                                STATE.patternNames.names[idx].revision = ref.records[0].revision;
                            }

                            if (mode === 0) {
                                // 完了メッセージ
                                Swal.close();
                                Swal.fire({
                                    toast: true,
                                    position: 'top',
                                    icon: 'success',
                                    title: 'パターンを保存しました。',
                                    timer: 3000,
                                    timerProgressBar: true,
                                    showConfirmButton: false,
                                });
                            }

                            return ref;
                        }
                        return null;
                    } catch (error) {
                        console.error('パターン保存に失敗しました。', error.error);
                        if (mode === 0) {
                            //error.error.headers['x-cybozu-error']
                            //const headerCode = error.error?.headers?.['x-cybozu-error'];
                            const errorCode = error.error?.code;
                            if (errorCode === 'GAIA_CO02') {
                                Swal.hideLoading();
                                Swal.update({
                                    title: 'パターン保存失敗',
                                    html: '<div>他のユーザが編集した可能性があります。<br>最新の内容を再表示後、再度適用を試みてください。</div>',
                                    icon: 'warning',
                                    confirmButtonText: '閉じる',
                                });
                            } else {
                                Swal.hideLoading();
                                Swal.update({
                                    title: 'パターン保存失敗',
                                    text: 'パターン保存に失敗しました。',
                                    icon: 'error',
                                    confirmButtonText: '閉じる',
                                });
                            }
                            return null;
                        } else {
                            // 顧客カルテに適用からのパターン更新は、完了メッセージは表示しない
                            throw error;
                        }
                    }
                };

                // メッセージを表示
                if (mode === 0) {
                    Swal.fire({
                        title: 'パターン保存中...',
                        allowOutsideClick: false, // ポップアップの外をクリックしても、画面を閉じない
                        didOpen: async () => {
                            Swal.showLoading();
                            await executePatternSave();
                        },
                    });
                } else {
                    // 顧客カルテに適用からのパターン更新
                    const result = await executePatternSave();
                    //await test();
                    return result;
                }
            };

            /**
             * 一括置換画面HTML作成
             * @param {string} staffsNew 変更後担当者optionタグ
             * @return {string} html
             */
            const replaceAllHTML = (staffsNew) => {
                const html = `
                <style>
                    .form-block {
                        width: 398.29px;
                        height: 210.29px;
                        padding: 12px;
                        box-sizing: border-box;
                        border: 1px solid #888;
                        margin: 8px;
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                        justify-content: center;
                    }
                </style>
                <div style="display: flex; justify-content: center; align-items: center; flex-direction: column;">
                    <div style="text-align: left;">
                        <p>変更する担当者区分を選択してください</p>
                        <span style="display:inline-block; border:1px solid #888; padding:4px 12px; margin-left:37px; margin-bottom:4px;">
                            <label style="margin:0;"><input type="checkbox" id="checkAll"> 全て選択</label>
                        </span><br>
                        <label style="margin-left:50px;"><input type="checkbox" id="staff" name="item" value="staff" checked> 担当者</label><br>
                        <label style="margin-left:50px;"><input type="checkbox" id="subStaff" name="item" value="subStaff"> 副担当者</label><br><br>
                        
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="display:inline-block; border:1px solid #888; padding:4px 12px; margin-bottom:4px;">
                                <p>変更する担当者</p>
                                <p style="margin-left:20px; margin-bottom:4px;">変更元の担当者</p>
                                <label style="margin-left:20px;"><input type="radio" name="staffRadio" value="pattern" checked> このパターンの担当者</label><br>
                                <label style="margin-left:20px;"><input type="radio" name="staffRadio" value="current"> 現在の顧客カルテの担当者</label><br><br>
                                <select id="staffSelect">${staffsNew}</select>
                            </span>
                            <span>→</span>
                            <!--<span style="display:inline-block; border:1px solid #888; padding:4px 12px; margin-bottom:4px;">-->
                            <span class="form-block">
                                
                                <p>変更後の担当者</p>
                                
                                <select id="afterStaffSelect">${staffsNew}</select>
                            </span>
                        </div>
                            <!--<div style="margin-left:20px;" style="display: flex; align-items: center; gap: 8px;">
                                <select id="staffSelect">${staffsNew}</select>
                                <span>→</span>
                                <select id="afterStaffSelect">${staffsNew}</select>
                            </div>-->
                    </div>
                </div>
            `;
                return html;
            };

            /**
             * selectの設定
             * @param {array} staffsCode 担当者option配列
             * @param {array} staffsCodePattern パターン担当者option配列
             * @param {array} substaffsCode 副担当者option配列
             * @return {string} options optionタグ
             */
            const generateBulkReplaceSelectOptions = (staffsCode, staffsCodePattern, substaffsCode) => {
                const radioButtons = Swal.getPopup().querySelectorAll('input[name="staffRadio"]:checked')[0];
                const staffCheckbox = Swal.getPopup().querySelector('#staff');
                const subStaffCheckbox = Swal.getPopup().querySelector('#subStaff');

                if (radioButtons.value === 'current' && staffCheckbox.checked && !subStaffCheckbox.checked) {
                    // 現在の顧客カルテの担当者　担当者のみ
                    options = staffsCode.map((opt) => `<option value="${opt.value}" key="${opt.value}">${opt.label}</option>`).join('');
                } else if (radioButtons.value === 'current' && !staffCheckbox.checked && subStaffCheckbox.checked) {
                    // 現在の顧客カルテの担当者　副担当者のみ
                    options = substaffsCode.map((opt) => `<option value="${opt.value}" key="${opt.value}">${opt.label}</option>`).join('');
                } else if (radioButtons.value === 'pattern') {
                    // パターンの担当者
                    options = staffsCodePattern.map((opt) => `<option value="${opt.value}" key="${opt.value}">${opt.label}</option>`).join('');
                } else if (staffCheckbox.checked && subStaffCheckbox.checked) {
                    // 担当者と副担当者のデータを比較
                    const combined = [...staffsCode, ...substaffsCode];
                    const uniqueCombined = Array.from(new Set(combined.map((opt) => opt.value))).map((value) => {
                        return combined.find((opt) => opt.value === value);
                    });
                    options = uniqueCombined.map((opt) => `<option value="${opt.value}" key="${opt.value}">${opt.label}</option>`).join('');
                }
                options = options + `<option value=${EMPTY_VALUE}>未設定</option>`;
                return options;
            };

            /**
             * 一括置換のバリデーション処理
             * @param {number} index パターンインデックス
             * @returns {object|boolean} バリデーション結果またはfalse
             */
            const validateBulkReplaceForm = (index) => {
                // チェックボックスのチェック有無
                const staffChecked = Swal.getPopup().querySelector('#staff').checked;
                const subStaffChecked = Swal.getPopup().querySelector('#subStaff').checked;
                if ((!staffChecked || String(staffChecked).trim() === '') && (!subStaffChecked || String(subStaffChecked).trim() === '')) {
                    Swal.showValidationMessage('担当者区分を選択してください');
                    return false;
                }

                // 必要なデータを呼び出し元に渡す
                let selectedStaff = Swal.getPopup().querySelector('#staffSelect').value; // 変更前担当者
                const afterStaffSelect = Swal.getPopup().querySelector('#afterStaffSelect').value; // 変更後担当者
                const radio = Swal.getPopup().querySelector('input[name="staffRadio"]:checked').value; // 顧客カルテ　パターン　から選択
                const staffCheck = Swal.getPopup().querySelector('#staff').checked; // 担当者
                const subStaffCheck = Swal.getPopup().querySelector('#subStaff').checked; // 副担当者

                // 変更前と変更後の担当者が同じ場合はエラー
                if (selectedStaff === afterStaffSelect) {
                    Swal.showValidationMessage('変更前と変更後の担当者が同じです。');
                    return false;
                }

                // 検索データ作成
                const items = initializeBulkReplaceFields({ staffCheck: staffCheck, subStaffCheck: subStaffCheck, radio: radio, index: index });
                selectedStaff = selectedStaff === EMPTY_VALUE ? '' : selectedStaff;

                // 置換元のデータがない場合、エラー
                let msgFlag = [false, false]; // [担当者,副担当者]
                let msg = '';
                let datas = null;
                if (staffCheck) {
                    if (radio === 'pattern') {
                        datas = STATE.listData.datas.map((p) => p.datas['pattern'][index - 1][items.searchStaff[0]]);
                    } else {
                        datas = STATE.listData.datas.map((p) => p.datas[items.searchStaff[0]]);
                    }

                    const rc = datas.includes(selectedStaff);
                    if (!rc) {
                        msgFlag[0] = true;
                        msg = '変更前担当者';
                    }
                }
                if (subStaffCheck) {
                    if (radio === 'pattern') {
                        datas = STATE.listData.datas.map((p) => p.datas['pattern'][index - 1][items.searchStaff[1]]);
                    } else {
                        datas = STATE.listData.datas.map((p) => p.datas[items.searchStaff[1]]);
                    }
                    const rc = datas.includes(selectedStaff);
                    if (!rc) {
                        msgFlag[1] = true;
                        msg = msg === '' ? '変更前副担当者' : msg + '、変更前副担当者';
                    }
                }

                if (staffCheck && subStaffCheck) {
                    if (msgFlag[0] && msgFlag[1]) {
                        Swal.showValidationMessage(msg + 'のデータがありません。');
                        return false;
                    }
                } else {
                    if (msgFlag[0] || msgFlag[1]) {
                        Swal.showValidationMessage(msg + 'のデータがありません。');
                        return false;
                    }
                }

                return {
                    staff: selectedStaff,
                    afterStaff: afterStaffSelect,
                    staffs: items,
                    radio: radio,
                    //staffCheck: staffCheck,
                    //subStaffCheck: subStaffCheck,
                    index: index,
                };
            };

            /**
             * 一括置換フィールド設定初期化
             * @param {object} result バリデーション結果
             * @returns {object} フィールド設定オブジェクト
             */
            const initializeBulkReplaceFields = (result) => {
                let staff = [];
                let patternStaff = [];
                let subStaff = [];
                let patternSubStaff = [];
                let searchStaff = [];

                if (result.staffCheck) {
                    // 担当者の場合
                    staff[0] = PATTERN_NAME_ITEMS[1].cd; // 担当者コード
                    staff[1] = PATTERN_NAME_ITEMS[2].cd; // 担当者名
                    staff[2] = PATTERN_NAME_ITEMS[7].cd; // 担当者所属コード
                    staff[3] = PATTERN_NAME_ITEMS[8].cd; // 担当者所属名
                    staff[4] = SELECTTYPE_NAME_ITEMS[0].cd; // 担当者コード名
                    staff[5] = SELECTTYPE_NAME_ITEMS[3].cd; // 担当者所属コード名

                    patternStaff[0] = PATTERN_NAME_ITEMS[1].cd; // 担当者コード
                    patternStaff[1] = PATTERN_NAME_ITEMS[2].cd; // 担当者名
                    patternStaff[2] = PATTERN_NAME_ITEMS[7].cd; // 担当者所属コード
                    patternStaff[3] = PATTERN_NAME_ITEMS[8].cd; // 担当者所属名
                    patternStaff[4] = SELECTTYPE_NAME_ITEMS[0].cd; // 担当者コード名
                    patternStaff[5] = SELECTTYPE_NAME_ITEMS[3].cd; // 担当者所属コード名

                    // 検索値の設定
                    if (result.radio === 'current') {
                        searchStaff[0] = staff[0];
                    } else if (result.radio === 'pattern') {
                        searchStaff[0] = patternStaff[0];
                    } else {
                        searchStaff[0] = '';
                    }
                }

                if (result.subStaffCheck) {
                    // 副担当者の場合
                    subStaff[0] = PATTERN_NAME_ITEMS[3].cd; // 副担当者コード
                    subStaff[1] = PATTERN_NAME_ITEMS[4].cd; // 副担当者名
                    subStaff[2] = PATTERN_NAME_ITEMS[9].cd; // 副担当者所属コード
                    subStaff[3] = PATTERN_NAME_ITEMS[10].cd; // 副担当者所属名
                    subStaff[4] = SELECTTYPE_NAME_ITEMS[1].cd; // 副担当者コード名
                    subStaff[5] = SELECTTYPE_NAME_ITEMS[4].cd; // 副担当者所属コード名
                    subStaff[6] = '更新日時'; // 更新日時

                    patternSubStaff[0] = PATTERN_NAME_ITEMS[3].cd; // 副担当者コード
                    patternSubStaff[1] = PATTERN_NAME_ITEMS[4].cd; // 副担当者名
                    patternSubStaff[2] = PATTERN_NAME_ITEMS[9].cd; // 副担当者所属コード
                    patternSubStaff[3] = PATTERN_NAME_ITEMS[10].cd; // 副担当者所属名
                    patternSubStaff[4] = SELECTTYPE_NAME_ITEMS[1].cd; // 副担当者コード名
                    patternSubStaff[5] = SELECTTYPE_NAME_ITEMS[4].cd; // 副担当者所属コード名

                    // 検索値の設定
                    if (result.radio === 'current') {
                        searchStaff[1] = subStaff[0];
                    } else if (result.radio === 'pattern') {
                        searchStaff[1] = patternSubStaff[0];
                    } else {
                        searchStaff[1] = '';
                    }
                }

                return {
                    staff,
                    patternStaff,
                    subStaff,
                    patternSubStaff,
                    searchStaff,
                };
            };

            /**
             * 担当者を一括置換
             * @param {object} item パターンオブジェクト
             */
            const replaceAllPattern = async (item) => {
                // 担当者情報取得
                const staffsCode = getUniqueOptions(SELECTTYPE_NAME_ITEMS[0].cd);
                const wk = '新_' + SELECTTYPE_NAME_ITEMS[0].cd + '_' + item.index;
                const staffsCodePattern = getUniqueOptions(wk);
                const substaffsCode = getUniqueOptions(SELECTTYPE_NAME_ITEMS[1].cd); // 副担当者

                let optionStaffs = staffsCode.map((opt) => `<option value="${opt.value}" key="${opt.value}">${opt.label}</option>`).join('');
                optionStaffs = optionStaffs + `<option value="${EMPTY_VALUE}">未設定</option>`;
                let optionStaffsPattern = staffsCodePattern.map((opt) => `<option value="${opt.value}" key="${opt.value}">${opt.label}</option>`).join('');
                optionStaffsPattern = optionStaffsPattern + `<option value="${EMPTY_VALUE}">未設定</option>`;

                // 担当者一括置換画面HTML作成
                const html = replaceAllHTML(optionStaffsPattern);

                /**
                 * 担当者一括置換ダイアログのイベント設定
                 */
                const setupBulkReplaceDialogEvents = () => {
                    // 担当者選択ラジオのイベント
                    const radioButtons = Swal.getPopup().querySelectorAll('input[name="staffRadio"]');
                    const select = Swal.getPopup().querySelector('#staffSelect');
                    radioButtons.forEach((radio) => {
                        radio.addEventListener('change', (event) => {
                            let options = generateBulkReplaceSelectOptions(staffsCode, staffsCodePattern, substaffsCode);
                            select.innerHTML = ''; // 初期化
                            // HTML文字列を構造化して追加
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(`<select>${options}</select>`, 'text/html');
                            const element = doc.querySelectorAll('option');
                            Array.from(element).forEach((opt) => {
                                select.appendChild(opt);
                            });
                            select.selectedIndex = 0;
                            //select.innerHTML = options;
                        });
                    });

                    // 「全て選択」チェックボックスのイベント
                    const checkAllBox = Swal.getPopup().querySelector('#checkAll');
                    const staffCheckbox = Swal.getPopup().querySelector('#staff');
                    const subStaffCheckbox = Swal.getPopup().querySelector('#subStaff');
                    if (checkAllBox && staffCheckbox && subStaffCheckbox) {
                        // 「全て選択」チェックボックスのイベント
                        checkAllBox.addEventListener('change', function () {
                            const checked = checkAllBox.checked;
                            staffCheckbox.checked = checked;
                            subStaffCheckbox.checked = checked;
                            if (staffCheckbox.checked && subStaffCheckbox.checked) {
                                let options = generateBulkReplaceSelectOptions(staffsCode, staffsCodePattern, substaffsCode);
                                select.innerHTML = ''; // 初期化
                                // HTML文字列を構造化して追加
                                const parser = new DOMParser();
                                const doc = parser.parseFromString(`<select>${options}</select>`, 'text/html');
                                const element = doc.querySelectorAll('option');
                                Array.from(element).forEach((opt) => {
                                    select.appendChild(opt);
                                });
                                select.selectedIndex = 0;
                                //select.innerHTML = options;
                            }
                            if (staffCheckbox.checked || subStaffCheckbox.checked) {
                                Swal.resetValidationMessage();
                            }
                        });

                        // 担当者/副担当者チェックボックスのイベント
                        const handleStaffCheckChange = function () {
                            if (!staffCheckbox.checked || !subStaffCheckbox.checked) {
                                checkAllBox.checked = false;
                            }
                            if (staffCheckbox.checked && subStaffCheckbox.checked) {
                                checkAllBox.checked = true;
                            }
                            if (staffCheckbox.checked || subStaffCheckbox.checked) {
                                Swal.resetValidationMessage();
                            }
                            let options = generateBulkReplaceSelectOptions(staffsCode, staffsCodePattern, substaffsCode);
                            select.innerHTML = ''; // 初期化
                            // HTML文字列を構造化して追加
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(`<select>${options}</select>`, 'text/html');
                            const element = doc.querySelectorAll('option');
                            Array.from(element).forEach((opt) => {
                                select.appendChild(opt);
                            });
                            select.selectedIndex = 0;
                            //select.innerHTML = options;
                        };
                        staffCheckbox.addEventListener('change', handleStaffCheckChange);
                        subStaffCheckbox.addEventListener('change', handleStaffCheckChange);
                    }
                };

                // 担当者一括置換画面作成
                const result = await Swal.fire({
                    title: '担当者一括置換',
                    html: html,
                    showCancelButton: true,
                    confirmButtonText: '実行',
                    cancelButtonText: 'キャンセル',
                    width: '1000px',
                    didOpen: setupBulkReplaceDialogEvents,
                    preConfirm: () => {
                        return validateBulkReplaceForm(item.index);
                    },
                    //width: '80%',
                });

                //console.log('result:', result);
                if (result.isDismissed) {
                    // キャンセルの場合
                    return;
                }

                const fields = result.value.staffs;

                const selectedStaffCode = result.value.staff; // 変更前担当者コード
                const afterStaffCode = result.value.afterStaff;

                STATE.listData.datas.forEach((data) => {
                    // 選択された担当者コードと同じ場合は置換

                    let wkDatas = null;
                    if (result.value.radio === 'pattern') {
                        // パターンの担当者
                        wkDatas = data.datas['pattern'][item.index - 1];
                    } else {
                        // 現在の顧客カルテの担当者
                        wkDatas = data.datas;
                    }
                    let wkPatternData = data.datas['pattern'][item.index - 1];

                    // 担当者
                    if (fields.staff.length > 0 && wkDatas[fields.searchStaff[0]] === selectedStaffCode) {
                        // 変更後データをセット
                        wkPatternData[fields.patternStaff[0]] = afterStaffCode;

                        STATE.selectStaffs
                            .filter((s) => s[STAFFMASTER_FIELD.staffCode.cd] === afterStaffCode)
                            .forEach((s) => {
                                wkPatternData[fields.patternStaff[1]] = s[STAFFMASTER_FIELD.staff.name];
                                wkPatternData[fields.patternStaff[2]] = s[STAFFMASTER_FIELD.organization.cd] && s[STAFFMASTER_FIELD.organization.cd].length > 0 ? s[STAFFMASTER_FIELD.organization.cd][0].code : '';
                                wkPatternData[fields.patternStaff[3]] = s[STAFFMASTER_FIELD.organization.cd] && s[STAFFMASTER_FIELD.organization.cd].length > 0 ? s[STAFFMASTER_FIELD.organization.cd][0].name : '';
                            });
                        wkPatternData[fields.patternStaff[4]] = '[' + wkPatternData[fields.patternStaff[0]] + ']' + wkPatternData[fields.patternStaff[1]];
                        //item.datas[fields.patternStaff[5]] = '[' + item.datas[fields.patternStaff[2]] + ']' + item.datas[fields.patternStaff[3]];
                        wkPatternData[fields.patternStaff[5]] = wkPatternData[fields.patternStaff[3]];
                        //wkDatas[fields.patternStaff[4] + '_vmodel'] = wkDatas[fields.patternStaff[4]];
                    }
                    // 副担当者
                    if (fields.subStaff.length > 0 && wkDatas[fields.searchStaff[1]] === selectedStaffCode) {
                        // 変更後データをセット
                        wkPatternData[fields.patternSubStaff[0]] = afterStaffCode;

                        STATE.selectStaffs
                            .filter((s) => s[STAFFMASTER_FIELD.staffCode.cd] === afterStaffCode)
                            .forEach((s) => {
                                wkPatternData[fields.patternSubStaff[1]] = s[STAFFMASTER_FIELD.staff.cd];
                                wkPatternData[fields.patternSubStaff[2]] = s[STAFFMASTER_FIELD.organization.cd] && s[STAFFMASTER_FIELD.organization.cd].length > 0 ? s[STAFFMASTER_FIELD.organization.cd][0].code : '';
                                wkPatternData[fields.patternSubStaff[3]] = s[STAFFMASTER_FIELD.organization.cd] && s[STAFFMASTER_FIELD.organization.cd].length > 0 ? s[STAFFMASTER_FIELD.organization.cd][0].name : '';
                            });
                        wkPatternData[fields.patternSubStaff[4]] = '[' + wkPatternData[fields.patternSubStaff[0]] + ']' + wkPatternData[fields.patternSubStaff[1]];
                        //wkDatas[fields.patternSubStaff[5]] = '[' + wkDatas[fields.patternSubStaff[2]] + ']' + wkDatas[fields.patternSubStaff[3]];
                        wkPatternData[fields.patternSubStaff[5]] = wkPatternData[fields.patternSubStaff[3]];
                        //data.datas[fields.patternSubStaff[4] + '_vmodel'] = data.datas[fields.patternSubStaff[4]];
                    }
                });

                console.log('一括置換が完了しました');
            };

            /**
             * 担当者 所属集計
             * @param {number} flg 0:担当者 1:所属
             */
            const totalCustomersPer = async (flg) => {
                // 担当者　所属のデータを作成
                let listTotal = null;
                let total = null;
                let title = '';
                if (flg === 0) {
                    // 担当者集計
                    listTotal = STATE.listTotal.staff;
                    total = totalStaff.value.staff;
                    title = '担当者別集計';
                } else if (flg === 1) {
                    // 所属集計
                    listTotal = STATE.listTotal.org;
                    total = totalStaff.value.org;
                    title = '所属別集計';
                }

                // Swalに表示
                // HTMLを作成
                let tableHtml = `
                    <table id="totalTable" style="width:100%; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <td colspan="14"></td>
                `;
                // パターン名
                for (let i = 0; i < STATE.patternNames.len; i++) {
                    tableHtml += `<th colspan="2"style="border: 1px solid #ddd; padding: 8px; background-color: ${STATE.patternNames.names[i].titleColor};">${STATE.patternNames.names[i].name}</th>`;
                }

                tableHtml += `
                            </tr>
                            <tr>
                                <!--<th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">担当者コード</th>-->
                                <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; text-align: center;">担当者名</th>
                `;

                // 月
                for (let i = 1; i <= 12; i++) {
                    tableHtml += `<th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; text-align: center;">${i}月</th>`;
                }

                tableHtml += `<th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">合計</th>`;

                for (let i = 0; i < STATE.patternNames.len; i++) {
                    tableHtml += `<th style="border: 1px solid #ddd; padding: 8px; background-color: ${STATE.patternNames.names[i].titleColor};">合計</th>`;
                    tableHtml += `<th style="border: 1px solid #ddd; padding: 8px; background-color: ${STATE.patternNames.names[i].titleColor};">増減</th>`;
                }
                tableHtml += `
                            </tr>
                        </thead>
                        <tbody>
                `;

                // listTotalを担当者コードで並び替える
                listTotal.sort((a, b) => {
                    if (a.code < b.code) return -1;
                    if (a.code > b.code) return 1;
                    return 0;
                });

                // ソート順を作成
                // STATE.listTotalのcodeとnameとtotalStaffで作成したstaffのcodeとnameをくっつけて、重複なしでcodeとnameのオブジェクト配列を作成
                const listTotalItems = (listTotal || []).map((item) => ({ code: item.code, name: item.name })).filter((item) => item.code && String(item.code).trim() !== '');
                const totalStaffItems = (total || []).flatMap((staffArray) => staffArray.map((item) => ({ code: item.code, name: item.name })).filter((item) => item.code && String(item.code).trim() !== ''));

                // 重複削除（codeをキーとして）
                const uniqueMap = new Map();
                [...listTotalItems, ...totalStaffItems].forEach((item) => {
                    if (!uniqueMap.has(item.code)) {
                        uniqueMap.set(item.code, item.name);
                    }
                });
                const allUniqueItems = Array.from(uniqueMap, ([code, name]) => ({ code, name }));

                // allUniqueItemsをcode順にソート
                allUniqueItems.sort((a, b) => {
                    if (a.code < b.code) return -1;
                    if (a.code > b.code) return 1;
                    return 0;
                });

                for (const { code, name } of allUniqueItems) {
                    let totalCount = 0;

                    tableHtml += `<tr>`;
                    tableHtml += `<td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${name}</td>`;

                    const item = listTotal.find((item) => item.code === code);
                    if (item) {
                        // 存在する場合のみ表示
                        if (!item.code || String(item.code).trim() === '') continue; // コードが空欄は除外

                        for (let i = 0; i < 12; i++) {
                            const monthData = item.datas.filter((data) => data.month === i + 1);
                            let wkCount = 0;
                            if (monthData.length > 0) {
                                wkCount = monthData[0].count;
                            } else {
                                wkCount = 0;
                            }
                            tableHtml += `
                                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${wkCount}</td>
                            `;
                        }
                        // 顧客数合計
                        totalCount = item.datas.filter((data) => data.month !== -1).reduce((sum, data) => sum + data.count, 0);
                        tableHtml += `<td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${totalCount}</td>`;
                    } else {
                        // 該当コードがない場合
                        for (let m = 0; m < 13; m++) {
                            tableHtml += `<td style="border: 1px solid #ddd; padding: 8px; text-align: right;">0</td>`;
                        }
                    }

                    // パターンごと
                    let totalCountPat = 0;
                    for (let i = 0; i < STATE.patternNames.len; i++) {
                        const staffData = total[i].filter((p) => p.code === code);
                        if (!staffData || staffData.length <= 0) {
                            const wktotal = 0 - totalCount;
                            tableHtml += `<td style="border: 1px solid #ddd; background-color: ${STATE.patternNames.names[i].itemsColor}; padding: 8px; text-align: right;">0</td>`;
                            tableHtml += `<td style="border: 1px solid #ddd; background-color: ${STATE.patternNames.names[i].itemsColor}; padding: 8px; text-align: right;">${wktotal}</td>`;
                            continue;
                        }

                        // 合計
                        totalCountPat = staffData[0].datas.filter((data) => data.month !== -1).reduce((sum, data) => sum + data.count, 0);
                        tableHtml += `<td style="border: 1px solid #ddd; background-color: ${STATE.patternNames.names[i].itemsColor}; padding: 8px; text-align: right;">${totalCountPat}</td>`;
                        // 増減
                        const diff = totalCountPat - totalCount;
                        tableHtml += `<td style="border: 1px solid #ddd; background-color: ${STATE.patternNames.names[i].itemsColor}; padding: 8px; text-align: right;">${diff}</td>`;
                    }
                    tableHtml += `</tr>`;
                }

                tableHtml += `
                        </tbody>
                    </table>
                `;

                console.log(total);
                await Swal.fire({
                    title: title,
                    html: tableHtml,
                    //width: '600px',
                    confirmButtonText: '閉じる',
                    width: '80%',
                    didOpen: () => {
                        //setupRowClickHighlighting('totalTable');
                    },
                });
                //console.log('totalData:', totalData);
                //return;
            };

            /**
             * 担当者集計
             * @param {number} flg 0:担当者集計　1:所属集計
             */
            const totalCustomersPerStaff = async (flg) => {
                // 担当者　所属のデータを作成
                let listTotal = null;
                if (flg === 0) {
                    // 担当者集計
                    listTotal = STATE.listTotal.staff;
                } else if (flg === 1) {
                    // 所属集計
                    listTotal = STATE.listTotal.org;
                }

                // Swalに表示
                // HTMLを作成
                let tableHtml = `
                    <table id="totalTable" style="width:100%; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <td colspan="14"></td>
                `;
                // パターン名
                for (let i = 0; i < STATE.patternNames.len; i++) {
                    tableHtml += `<th colspan="2"style="border: 1px solid #ddd; padding: 8px; background-color: ${STATE.patternNames.names[i].titleColor};">${STATE.patternNames.names[i].name}</th>`;
                }

                tableHtml += `
                            </tr>
                            <tr>
                                <!--<th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">担当者コード</th>-->
                                <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; text-align: center;">担当者名</th>
                `;

                // 月
                for (let i = 1; i <= 12; i++) {
                    tableHtml += `<th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; text-align: center;">${i}月</th>`;
                }

                tableHtml += `<th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">合計</th>`;

                for (let i = 0; i < STATE.patternNames.len; i++) {
                    tableHtml += `<th style="border: 1px solid #ddd; padding: 8px; background-color: ${STATE.patternNames.names[i].titleColor};">合計</th>`;
                    tableHtml += `<th style="border: 1px solid #ddd; padding: 8px; background-color: ${STATE.patternNames.names[i].titleColor};">増減</th>`;
                }
                tableHtml += `
                            </tr>
                        </thead>
                        <tbody>
                `;

                let codes = []; // 担当者コードをためる
                STATE.listTotal.forEach((staff) => {
                    if (!staff.code || String(staff.code).trim() === '') return; // 担当者コードが空欄は除外

                    tableHtml += `
                        <tr>
                            <!--<td style="border: 1px solid #ddd; padding: 8px;">${staff.code}</td>-->
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${staff.name}</td>
                    `;

                    for (let i = 0; i < 12; i++) {
                        const monthData = staff.datas.filter((data) => data.month === i + 1);
                        let wkCount = 0;
                        if (monthData.length > 0) {
                            wkCount = monthData[0].count;
                        } else {
                            wkCount = 0;
                        }
                        tableHtml += `
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${wkCount}</td>
                        `;
                    }
                    // 顧客数合計
                    const totalCount = staff.datas.reduce((sum, data) => sum + data.count, 0);
                    tableHtml += `<td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${totalCount}</td>`;

                    // パターンごと
                    let totalCountPat = 0;
                    for (let i = 0; i < STATE.patternNames.len; i++) {
                        const staffData = totalStaff.value[i].filter((s) => s.code === staff.code);
                        if (!staffData || staffData.length <= 0) {
                            tableHtml += `<td style="border: 1px solid #ddd; background-color: ${STATE.patternNames.names[i].itemsColor}; padding: 8px; text-align: right;">0</td>`;
                            tableHtml += `<td style="border: 1px solid #ddd; background-color: ${STATE.patternNames.names[i].itemsColor}; padding: 8px; text-align: right;">-${totalCount}</td>`;
                            continue;
                        }
                        // 合計
                        totalCountPat = staffData[0].datas.reduce((sum, data) => sum + data.count, 0);
                        tableHtml += `<td style="border: 1px solid #ddd; background-color: ${STATE.patternNames.names[i].itemsColor}; padding: 8px; text-align: right;">${totalCountPat}</td>`;

                        // 増減
                        const diff = totalCountPat - totalCount;
                        tableHtml += `<td style="border: 1px solid #ddd; background-color: ${STATE.patternNames.names[i].itemsColor}; padding: 8px; text-align: right;">${diff}</td>`;

                        // 担当者コードをためる
                        codes.push(staff.code);
                    }
                });
                tableHtml += `</tr>`;

                // パターンに存在するが、全体集計に存在しない担当者コードを表示
                // （全員新規担当者のため、増減は全てプラス）
                // パターンの担当者コードと担当者名取得
                const codesPat = [
                    ...new Set(
                        totalStaff.value.flatMap((group) =>
                            group.map((item) => {
                                return { code: item.code, name: item.name };
                            })
                        )
                    ),
                ];

                // 重複削除
                const uniqueMap = new Map();
                codesPat.forEach(({ code, name }) => {
                    if (code && String(code).trim() !== '' && !uniqueMap.has(code)) {
                        uniqueMap.set(code, name);
                    }
                });
                const uniqueCodesPat = Array.from(uniqueMap, ([code, name]) => ({ code, name }));

                // 全体集計に存在しない担当者コードを抽出
                const codesDiff = uniqueCodesPat.filter((item) => !codes.includes(item.code));

                let wkCodes = [];
                codesDiff.forEach((item) => {
                    for (let i = 0; i < STATE.patternNames.len; i++) {
                        const staff = totalStaff.value[i].filter((s) => s.code === item.code)[0];

                        if (!wkCodes.includes(item.code)) {
                            // まだ表示していない担当者コードの場合のみ表示
                            tableHtml += `<tr>`;
                            tableHtml += `<td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${item.name}</td>`;
                            for (let m = 0; m < 13; m++) {
                                tableHtml += `<td style="border: 1px solid #ddd; padding: 8px; text-align: right;">0</td>`;
                            }
                        }
                        if (staff) {
                            // 合計
                            totalCountPat = staff.datas.reduce((sum, data) => sum + data.count, 0);
                            tableHtml += `<td style="border: 1px solid #ddd; background-color: ${STATE.patternNames.names[i].itemsColor}; padding: 8px; text-align: right;">${totalCountPat}</td>`;

                            // 増減（全員新規のため、増減は全てプラス）
                            tableHtml += `<td style="border: 1px solid #ddd; background-color: ${STATE.patternNames.names[i].itemsColor}; padding: 8px; text-align: right;">${totalCountPat}</td>`;
                        } else {
                            // 該当パターンにデータがない場合
                            tableHtml += `<td style="border: 1px solid #ddd; background-color: ${STATE.patternNames.names[i].itemsColor}; padding: 8px; text-align: right;">0</td>`;
                            tableHtml += `<td style="border: 1px solid #ddd; background-color: ${STATE.patternNames.names[i].itemsColor}; padding: 8px; text-align: right;">0</td>`;
                        }
                        // 担当者コードをためる
                        wkCodes.push(item.code);
                    }
                    tableHtml += `</tr>`;
                });

                tableHtml += `
                            <!--</tr>-->
                        </tbody>
                    </table>
                `;

                console.log(totalStaff);
                await Swal.fire({
                    title: '担当者別集計',
                    html: tableHtml,
                    //width: '600px',
                    confirmButtonText: '閉じる',
                    width: '80%',
                    didOpen: () => {
                        //setupRowClickHighlighting('totalTable');
                    },
                });
                //console.log('totalData:', totalData);
                //return;
            };

            /**
             * 担当者整合性チェック（不要）
             */
            const checkStaffConsistency = async () => {
                // 取得していた担当者マスタのデータを使用
                // 施設・備品キーの値が配列データの「施設・備品」を除いたデータをfilteredStaffsに代入
                let filteredStaffs = Array.isArray(STATE.selectStaffs) ? STATE.selectStaffs.filter((staff) => !(Array.isArray(staff['施設・備品']) && staff['施設・備品'].length > 0)) : [];
                // 非表示フラグキーの値が配列データでないもののみを取得
                filteredStaffs = Array.isArray(filteredStaffs) ? filteredStaffs.filter((staff) => !(Array.isArray(staff['非表示フラグ']) && staff['非表示フラグ'].length > 0)) : [];
                // 退社日キーがnull, 空文字, undefinedの場合のみ抽出
                //filteredStaffs = Array.isArray(filteredStaffs) ? filteredStaffs.filter((staff) => staff['退社日'] === null || staff['退社日'] === '' || typeof staff['退社日'] === 'undefined') : [];
                // 退社日キーが現在日付より未来の日付のものを抽出
                filteredStaffs = Array.isArray(filteredStaffs)
                    ? filteredStaffs.filter((staff) => {
                          if (staff['退社日']) {
                              const wkDate = staff['退社日'].replace(/-/g, '');
                              const today = TODAY.toFormat('yyyyMMdd');
                              if (Number(wkDate) <= Number(today)) {
                                  return false;
                              }
                          }
                          return true;
                      })
                    : [];

                const cd = STAFFMASTER_FIELD.staffCode.cd;
                const nm = STAFFMASTER_FIELD.staff.cd;

                const pairs = (filteredStaffs ?? [])
                    .filter((item) => item[cd] !== undefined && item[cd] !== null && String(item[cd]).trim() !== '')
                    .map((item) => ({
                        label: '[' + item[cd] + ']' + item[nm],
                        value: item[cd],
                    }));

                // STATE.listData.datasにあってpairsにない担当者コード・担当者名をpairsの最後に追加
                let mismatchList = [];
                const pairsCodes = pairs.map((p) => p.value);
                (STATE.listData.datas ?? []).forEach((item) => {
                    const staffCode = item.datas?.[PATTERN_NAME_ITEMS[1].cd];
                    const staffName = item.datas?.[PATTERN_NAME_ITEMS[2].cd];
                    //const staff = item.datas?.[SELECTTYPE_NAME_ITEMS[0].cd];
                    const customerCode = item.datas?.[PATTERN_NAME_ITEMS[5].cd];
                    const customerName = item.datas?.[PATTERN_NAME_ITEMS[6].cd];
                    //const costmer = item.datas?.[SELECTTYPE_NAME_ITEMS[2].cd];
                    if (staffCode && !pairsCodes.includes(staffCode)) {
                        mismatchList.push({
                            staff: {
                                label: '[' + staffCode + ']' + staffName,
                                value: staffCode,
                            },
                            customer: {
                                label: '[' + customerCode + ']' + customerName,
                                value: customerCode,
                            },
                            id: item.datas[CUSTOMERCHART_FIELD.id.readCd],
                        });
                        //console.log('整合性チェック:担当者マスタに存在しない担当者：', mismatchList);
                    }
                });

                // HTMLを作成
                let tableHtml = `
                    <table id="totalTable" style="width:100%; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">顧客名</th>
                                <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">担当者名</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                mismatchList.forEach((item) => {
                    tableHtml += `
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: left;">
                                <span :title="'顧客コード名'">
                                    <a style="color:inherit; text-decoration:underline; cursor:pointer;" href="${generateHref(item.id)}" target="_blank">${item.customer.label}</a>
                                </span>
                            </td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${item.staff.label}</td>
                        </tr>
                    `;
                });
                tableHtml += `
                        </tbody>
                    </table>
                `;

                // Swalに表示
                await Swal.fire({
                    title: '担当者整合性チェック',
                    html: tableHtml,
                    //width: '600px',
                    confirmButtonText: '閉じる',
                    width: '80%',
                    didOpen: () => {
                        //setupRowClickHighlighting('totalTable');
                    },
                });
            };

            /**
             * windowの倍率変更時にポップアップの高さを調整する
             */
            window.addEventListener('resize', function () {
                // 画面の推定倍率を取得
                const windowHeight = window.innerHeight;
                const zoomLevel = window.outerHeight / windowHeight;

                const popup = Swal.getPopup();
                if (popup) {
                    // ポップアップ画面が表示されている場合、高さを再計算
                    const popupheight = popup.getBoundingClientRect().height * zoomLevel;

                    const item1 = document.querySelector('#swal2-title').getBoundingClientRect().height; // タイトル
                    // const item2 = popup.querySelector('#swal2-html-container').getBoundingClientRect().height; // 表
                    const item2 = document.querySelector('.swal2-actions').getBoundingClientRect().height; // ボタン
                    const items = item1 + item2;

                    bizupUtil.common.resizeDialog(popupheight, items + 50, 'swal2-html-container');
                }
            });

            /**
             * 担当者リスト取得
             * @param {string} selectedStaff current:現在の担当者 pattern:パターンの担当者
             * @return {array} オプション配列
             */
            const getStaffList = (selectedStaff) => {
                let code = '';
                if ('current' === selectedStaff) {
                    code = SELECTTYPE_NAME_ITEMS[0].cd;
                } else {
                    const num = Number(selectedStaff.match(/\d+/));
                    code = '新' + SELECTTYPE_NAME_ITEMS[0].cd + num;
                }

                const rc = getUniqueOptions(code);
                return rc;
            };

            /**
             * チェックボックス変更イベント
             * @param {Event} event イベントオブジェクト
             */
            const handleCheckboxChange = (event) => {
                const checkbox = event.target;
                const row = checkbox.closest('tr');
                const tbody = row.parentElement; // 親要素
                const rowsInTbody = Array.from(tbody.querySelectorAll('tr'));
                const relativeIndex = rowsInTbody.indexOf(row);
                const name = row.cells[1]?.textContent?.trim() ?? '';
                const wk = { clickNo: relativeIndex, datas: [], clickName: name };
                if (checkbox.checked) {
                    // 挿入位置を検索
                    let index = STATE.listDataPattern.findIndex((item) => item.clickNo > relativeIndex);
                    if (index === -1) {
                        // 挿入位置が見つからない場合は末尾に追加
                        STATE.listDataPattern.push(wk);
                    } else {
                        // 見つかった位置に挿入
                        STATE.listDataPattern.splice(index, 0, wk);
                    }
                    row.style.backgroundColor = HIGHTLIGHT_COLOR;
                } else {
                    // 既に選択されている場合はリストから削除
                    const idx = STATE.listDataPattern.findIndex((item) => item.clickNo === relativeIndex);
                    if (idx !== -1) {
                        STATE.listDataPattern.splice(idx, 1);
                        row.style.backgroundColor = '';
                    }
                }
                Swal.resetValidationMessage(); // バリデーションメッセージをリセット
            };

            /**
             * 行クリックでハイライト設定
             * @param {string} tableId テーブルID
             * @param {array} selectedPatterns 再表示の際に、ユーザーのデータを反映させるための配列
             * @param {string} highlightClass ハイライトカラー
             */
            const setupRowClickHighlighting = (tableId, selectedPatterns, highlightClass = HIGHTLIGHT_COLOR) => {
                const rows = document.querySelectorAll(`#${tableId} tbody tr`);
                rows.forEach((row) => {
                    // 全行にイベントリスナーを追加
                    row.addEventListener('click', (event) => {
                        if (!event.target.matches('input[type="checkbox"]')) {
                            // チェックボックスがクリックされた場合は無視
                            const checkbox = row.querySelector('input[type="checkbox"]');
                            if (checkbox.checked) {
                                checkbox.checked = false;
                                row.style.backgroundColor = '';
                            } else {
                                checkbox.checked = true;
                                row.style.backgroundColor = highlightClass;
                            }

                            Swal.resetValidationMessage(); // バリデーションメッセージをリセット
                            // イベントを発火させる
                            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                            //console.log('クリックされた行のインデックス:', STATE.listDataPattern.clickNo);
                        }
                    });
                });

                //チェックボックスにイベントを追加する
                const checkboxes = Swal.getPopup().querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach((checkbox) => {
                    // チェックボックスの状態を設定
                    const isChecked = selectedPatterns.some((pattern) => pattern.index === parseInt(checkbox.value));
                    checkbox.checked = isChecked;
                    checkbox.addEventListener('change', handleCheckboxChange);
                    if (selectedPatterns.some((pattern) => pattern.index === parseInt(checkbox.value))) {
                        // チェックされている場合、行にハイライトを設定
                        const row = checkbox.closest('tr');
                        row.style.backgroundColor = highlightClass;
                        // チェックされている場合、イベントを発火させる
                        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });

                // ポップアップダイアログ画面の高さを調整
                const popup = Swal.getPopup();

                const item1 = popup.querySelector('#swal2-title').getBoundingClientRect().height; // タイトル
                const item2 = 48 + 10 + 10 + 16; // メッセージエリア（呼び出し時は設定されていないので、固定にして、エリアを確保しておく）
                const item3 = popup.querySelector('.swal2-actions').getBoundingClientRect().height; // ボタン
                const items = item1 + item2 + item3;

                utils.common.resizeDialog(popup.offsetHeight, items + 50, 'swal2-html-container');
            };

            /**
             * フィルタリングされた行を取得
             * @return {array} フィルタリングされた行の配列
             */
            const filteredRows = computed(() => {
                if (!STATE.listData?.datas || !Array.isArray(STATE.listData.datas)) return [];
                return STATE.listData.datas.filter((item) => {
                    return Object.keys(STATE.filters).every((key) => {
                        const filterValue = String(STATE.filters[key] ?? '').trim();
                        if (filterValue === 'すべて') return true;
                        let flg = 0;
                        let num = 0;
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
                            //nm = PATTERN_NAME_ITEMS[8].label;
                            nm = SELECTTYPE_NAME_ITEMS[3].cd;
                        } else if (key === SELECTTYPE_NAME_ITEMS[4].cd) {
                            cd = PATTERN_NAME_ITEMS[9].cd;
                            //nm = PATTERN_NAME_ITEMS[10].label;
                            nm = SELECTTYPE_NAME_ITEMS[4].cd;
                        } else {
                            // この箇所はメソッドにするかも
                            // 新パターン名での絞込対応
                            const str = key.split('_');
                            if (str.length === 3) {
                                if (str[1] === SELECTTYPE_NAME_ITEMS[0].cd || str[1] === SELECTTYPE_NAME_ITEMS[1].cd) {
                                    cd = str[1];
                                } else if (str[1] === SELECTTYPE_NAME_ITEMS[3].cd) {
                                    cd = PATTERN_NAME_ITEMS[7].cd;
                                } else if (str[1] === SELECTTYPE_NAME_ITEMS[4].cd) {
                                    cd = PATTERN_NAME_ITEMS[9].cd;
                                }
                                num = Number(str[2]);
                                if (str[0] === '新') {
                                    flg = 1;
                                } else if (str[0] === '旧') {
                                    flg = 2;
                                }
                            }
                        }
                        let cellValue = '';
                        if (flg === 0) {
                            cellValue = String((key === nm ? item.datas[cd] : item.datas[key] ?? '') ?? '');
                        } else if (flg === 1) {
                            // パターンの場合
                            cellValue = String(item.datas['pattern'][num - 1]?.[cd] ?? '');
                        } else if (flg === 2) {
                            // バックアップ用フィルタリング
                            cellValue = String(item.datas['pattern'][num - 1]['OLD']?.[cd] ?? '');
                        }
                        //nm cd
                        if (filterValue === '') return true; // 絞込なし
                        if (filterValue === EMPTY_VALUE) return cellValue === ''; // 空のみ
                        return cellValue.toLowerCase().includes(filterValue.toLowerCase());
                    });
                });
            });

            /**
             * 絞込作成
             * @param {string} code フィールドコード
             * @returns {array} 絞込用オプション配列
             */
            const getUniqueOptions = (code) => {
                let cd = '';
                let nm = '';
                let staffFlg = [false, false]; // 担当者、副担当者フラグ
                let departmentFlg = [false, false]; // 担当者所属、副担当者所属フラグ

                // 担当者、副担当者、顧客名のときはコード＋名前で表示
                if (code === SELECTTYPE_NAME_ITEMS[0].cd) {
                    // 担当者
                    cd = PATTERN_NAME_ITEMS[1].cd;
                    nm = PATTERN_NAME_ITEMS[2].label;
                } else if (code === SELECTTYPE_NAME_ITEMS[1].cd) {
                    // 副担当者
                    cd = PATTERN_NAME_ITEMS[3].cd;
                    nm = PATTERN_NAME_ITEMS[4].label;
                } else if (code === SELECTTYPE_NAME_ITEMS[2].cd) {
                    // 顧客名
                    cd = PATTERN_NAME_ITEMS[5].cd;
                    nm = PATTERN_NAME_ITEMS[6].label;
                } else if (code === SELECTTYPE_NAME_ITEMS[3].cd) {
                    // 担当者所属
                    cd = PATTERN_NAME_ITEMS[7].cd;
                    nm = PATTERN_NAME_ITEMS[8].label;
                } else if (code === SELECTTYPE_NAME_ITEMS[4].cd) {
                    // 副担当者所属
                    cd = PATTERN_NAME_ITEMS[9].cd;
                    nm = PATTERN_NAME_ITEMS[10].label;
                }

                const datas = code.split('_');
                if (datas.length === 3) {
                    if (datas[1] === SELECTTYPE_NAME_ITEMS[0].cd || datas[1] === SELECTTYPE_NAME_ITEMS[1].cd) {
                        // 担当者、副担当者
                        staffFlg = [true, true];
                    } else if (datas[1] === SELECTTYPE_NAME_ITEMS[3].cd || datas[1] === SELECTTYPE_NAME_ITEMS[4].cd) {
                        // 担当者所属、副担当者所属
                        departmentFlg = [true, true];
                    }
                }

                let pairs = [];
                if (code === SELECTTYPE_NAME_ITEMS[0].cd || code === SELECTTYPE_NAME_ITEMS[1].cd || staffFlg.some((f) => f)) {
                    const filteredStaffs = [...STATE.selectStaffs]; // 初期表示時にデータ設定済
                    cd = STAFFMASTER_FIELD.staffCode.cd;
                    nm = STAFFMASTER_FIELD.staff.cd;

                    pairs = (filteredStaffs ?? [])
                        .filter((item) => item[cd] !== undefined && item[cd] !== null && String(item[cd]).trim() !== '')
                        .map((item) => ({
                            label: '[' + item[cd] + ']' + item[nm],
                            value: item[cd],
                        }));

                    if (!staffFlg.some((f) => f)) {
                        // STATE.listData.datasにあってpairsにない担当者コード・担当者名をpairsの最後に追加
                        const pairsCodes = pairs.map((p) => p.value);
                        (STATE.listData.datas ?? []).forEach((item) => {
                            let staffCode = '';
                            let staffName = '';
                            if (code === SELECTTYPE_NAME_ITEMS[0].cd) {
                                staffCode = item.datas?.[PATTERN_NAME_ITEMS[1].cd];
                                staffName = item.datas?.[PATTERN_NAME_ITEMS[2].cd];
                            } else {
                                staffCode = item.datas[PATTERN_NAME_ITEMS[3].cd];
                                staffName = item.datas[PATTERN_NAME_ITEMS[4].cd];
                            }
                            if (staffCode && !pairsCodes.includes(staffCode)) {
                                pairs.push({
                                    label: '[' + staffCode + ']' + staffName,
                                    value: staffCode,
                                });
                            }
                        });
                    }
                } else if (code === SELECTTYPE_NAME_ITEMS[3].cd || code === SELECTTYPE_NAME_ITEMS[4].cd || departmentFlg.some((f) => f)) {
                    const filteredDepartments = [...STATE.selectStaffs]; // 初期表示時にデータ設定済
                    // 組織選択キーの配列データからlabel/valueオブジェクト配列を作成
                    pairs = (filteredDepartments ?? [])
                        .filter((item) => Array.isArray(item[STAFFMASTER_FIELD.organization.cd]) && item[STAFFMASTER_FIELD.organization.cd].length > 0)
                        .flatMap((item) =>
                            item[STAFFMASTER_FIELD.organization.cd].map((org) => ({
                                //label: '[' + org.code + ']' + org.name,
                                label: org.name,
                                value: org.code,
                            }))
                        );
                    if (!departmentFlg.some((f) => f)) {
                        // STATE.listData.datasにあってpairsにない担当者コード・担当者名をpairsの最後に追加
                        const pairsCodes = pairs.map((p) => p.value);
                        (STATE.listData.datas ?? []).forEach((item) => {
                            let departmentCode = '';
                            let departmentName = '';
                            if (code === SELECTTYPE_NAME_ITEMS[3].cd) {
                                departmentCode = item.datas?.[PATTERN_NAME_ITEMS[7].cd];
                                departmentName = item.datas?.[PATTERN_NAME_ITEMS[8].cd];
                            } else {
                                departmentCode = item.datas[PATTERN_NAME_ITEMS[9].cd];
                                departmentName = item.datas[PATTERN_NAME_ITEMS[10].cd];
                            }
                            if (departmentCode && !pairsCodes.includes(departmentCode)) {
                                pairs.push({
                                    //label: '[' + departmentCode + ']' + departmentName,
                                    label: departmentName,
                                    value: departmentCode,
                                });
                            }
                        });
                    }
                } else {
                    // それ以外は通常処理
                    pairs = (STATE.listData?.datas ?? [])
                        .filter((item) => item.datas[cd] !== undefined && item.datas[cd] !== null && String(item.datas[cd]).trim() !== '')
                        .map((item) => ({
                            label: '[' + item.datas[cd] + ']' + item.datas[nm],
                            value: item.datas[cd],
                        }));
                }

                // 重複削除
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
             * @param {string} key コード
             * @return {boolean} true:表示、false:非表示
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
             * @param {string} label ラベル
             * @return {boolean} true:選択項目、false:テキスト項目
             */
            const isSelectType = (label) => {
                let rc = false;
                const str = label.replace(/（バックアップ）/, ''); // 数値部分削除
                // 選択項目
                const select = SELECTTYPE_NAME_ITEMS.map((item) => item.label);
                if (select.includes(str)) {
                    rc = true;
                }
                return rc;
            };

            /**
             * keyが新担当者コード名、新副担当者コード名のときは、trueをかえす
             * @param {string} key コード
             * @return {boolean} true:新担当者コード名 or 新副担当者コード名　false:それ以外
             */
            const isSelectData = (key) => {
                let rc = false;
                const str = key.split('_');
                if (str.length !== 3) return rc; // パターン　バックアップではない
                if (str[0] === '新') {
                    rc = true;
                }
                return rc;
            };

            /**
             * 担当者選択変更時の処理
             * @param {number} id id
             * @param {object} event イベント
             * @param {string} key コード
             */
            const changeStaff = (id, event, key) => {
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

                // id からindexを取得
                const index = STATE.listData.datas.findIndex((item) => item.datas['$id'] === id);
                if (index === -1) return;

                const str = key.split('_');
                const num = Number(str[2]); // 数値のみ取得
                STATE.listData.datas[index].datas['pattern'][num - 1][str[1]] = value;

                let cd = ''; // 担当者
                let nm = '';
                let orgCd = ''; // 担当者所属
                let orgNm = '';
                let org = ''; // 所属の[code]name用

                if (str[1] === SELECTTYPE_NAME_ITEMS[0].cd) {
                    cd = PATTERN_NAME_ITEMS[1].cd;
                    nm = PATTERN_NAME_ITEMS[2].label;
                    orgCd = PATTERN_NAME_ITEMS[7].cd;
                    orgNm = PATTERN_NAME_ITEMS[8].label;
                    org = SELECTTYPE_NAME_ITEMS[3].cd;
                } else if (str[1] === SELECTTYPE_NAME_ITEMS[1].cd) {
                    cd = PATTERN_NAME_ITEMS[3].cd;
                    nm = PATTERN_NAME_ITEMS[4].label;
                    orgCd = PATTERN_NAME_ITEMS[9].cd;
                    orgNm = PATTERN_NAME_ITEMS[10].label;
                    org = SELECTTYPE_NAME_ITEMS[4].cd;
                }

                STATE.listData.datas[index].datas['pattern'][num - 1][cd] = code;
                STATE.listData.datas[index].datas['pattern'][num - 1][nm] = name;

                // 担当者変更に伴って、所属も変更する
                if (code !== '') {
                    const staff = STATE.selectStaffs.find((staff) => staff[STAFFMASTER_FIELD.staffCode.cd] === code);
                    const orgs = staff[STAFFMASTER_FIELD.organization.cd];
                    STATE.listData.datas[index].datas['pattern'][num - 1][org] = orgs.at(CONF.radOrg).name;
                    STATE.listData.datas[index].datas['pattern'][num - 1][orgCd] = orgs.at(CONF.radOrg).code;
                    STATE.listData.datas[index].datas['pattern'][num - 1][orgNm] = orgs.at(CONF.radOrg).name;
                } else {
                    // 空の場合は所属も空にする
                    STATE.listData.datas[index].datas['pattern'][num - 1][org] = '';
                    STATE.listData.datas[index].datas['pattern'][num - 1][orgCd] = '';
                    STATE.listData.datas[index].datas['pattern'][num - 1][orgNm] = '';
                }
                //console.log('changeStaff:', index, event, key, ' code:', code, ' name:', name, ' cd:', cd, ' nm:', nm);
            };

            /**
             * コードから背景色を設定（タイトル用）
             * @param {string} key コード
             * @return {string} 背景色
             */
            const setTitleBackColor = (key) => {
                const wk = key.split('_'); // _で分割して2番目を取得
                const num = Number(wk[2]); // 数値のみ取得
                let str = '';
                if (wk.length === 3) {
                    str = wk[1];
                } else {
                    str = key; // 数値部分削除
                }
                const patterns = [SELECTTYPE_NAME_ITEMS[0].cd, SELECTTYPE_NAME_ITEMS[1].cd, SELECTTYPE_NAME_ITEMS[3].cd, SELECTTYPE_NAME_ITEMS[4].cd];

                let color = '';
                if (patterns.includes(str)) {
                    color = PATTERN_TITLE_COLOR[num - 1];
                }
                return color;
            };

            /**
             * コードから背景色を設定（データ用）
             * @param {string} key コード
             * @param {object} datas データ
             * @return {string} 背景色
             */
            const setItemBackColor = (key, datas) => {
                const wk = key.split('_'); // _で分割して2番目を取得
                const num = Number(wk[2]); // 数値のみ取得
                let str = '';
                if (wk.length === 3) {
                    str = wk[1];
                } else {
                    str = key;
                }
                const patterns = [SELECTTYPE_NAME_ITEMS[0].cd, SELECTTYPE_NAME_ITEMS[1].cd, SELECTTYPE_NAME_ITEMS[3].cd, SELECTTYPE_NAME_ITEMS[4].cd];
                const items = SELECTTYPE_NAME_ITEMS.filter((item) => item.cd !== SELECTTYPE_NAME_ITEMS[2].cd);

                // 背景色
                let color = '';
                if (patterns.includes(str) && (wk[0] === '新' || wk[0] === '旧') && !isNaN(num)) {
                    color = PATTERN_ITEMS_COLOR[num - 1];
                }

                // 表示用とデータが違う場合、背景色を変更する
                const index = patterns.findIndex((p) => p === str);
                if (index !== -1 && color !== '') {
                    let wkKey = '';
                    if (wk[0] === '新') {
                        wkKey = datas['pattern'][num - 1][str];
                    } else if (wk[0] === '旧') {
                        wkKey = datas['pattern'][num - 1]['OLD'][str];
                    }
                    if (datas[items[index].cd] !== wkKey) {
                        color = CUSTOMER_CHANGE_BACKCOLOR;
                    }
                }

                // 担当者整合性チェック
                if (datas['className']) {
                    if (key === SELECTTYPE_NAME_ITEMS[0].cd) {
                        color = datas['className']['staff']?.back;
                    } else if (key === SELECTTYPE_NAME_ITEMS[1].cd) {
                        color = datas['className']['substaff']?.back;
                    } else if (key === SELECTTYPE_NAME_ITEMS[3].cd) {
                        color = datas['className']['staffOrg']?.back;
                        //console.log('className:', datas['className']);
                    } else if (key === SELECTTYPE_NAME_ITEMS[4].cd) {
                        color = datas['className']['substaffOrg']?.back;
                    } else {
                        color = CUSTOMER_NOCHANGE_COLOR;
                    }
                } else {
                    color = CUSTOMER_NOCHANGE_COLOR;
                }
                return color;
            };

            /**
             * コードからフォント色を設定（データ用）
             * @param {string} key コード
             * @param {object} datas データ
             * @return {string} フォント色
             */
            const setItemFontColor = (key, datas) => {
                let color = '';
                // 担当者整合性チェック
                if (datas['className']) {
                    if (key === SELECTTYPE_NAME_ITEMS[0].cd) {
                        color = datas['className']['staff']?.font;
                    } else if (key === SELECTTYPE_NAME_ITEMS[1].cd) {
                        color = datas['className']['substaff']?.font;
                    } else if (key === SELECTTYPE_NAME_ITEMS[3].cd) {
                        color = datas['className']['staffOrg']?.font;
                        //console.log('className:', datas['className']);
                    } else if (key === SELECTTYPE_NAME_ITEMS[4].cd) {
                        color = datas['className']['substaffOrg']?.font;
                    }
                }
                return color;
            };

            /**
             * URLを生成する
             * @param {Number} id
             * @return {string} URL
             */
            const generateHref = (id) => {
                return bizupUtil.common.generateHref(bizupUtil.constants.CUSTOMER_APP_ID, id);
            };

            /**
             * コードからデータを取得する
             * @param {String} code
             * @return {object} datas
             */
            const getStaffData = (code, datas) => {
                let rc = '';
                let flg = false;

                const wkCodes = code.split('_');
                if (wkCodes.length === 3) {
                    if (!isNaN(Number(wkCodes[2]))) {
                        let str = code.replace(/\d+/g, ''); // 数値部分削除
                        const index = Number(code.match(/\d+/)); // 数値のみ取得
                        if (wkCodes[0] === '新') {
                            // パターンの場合
                            Object.keys(datas).forEach((item) => {
                                if (item === 'pattern' && index === datas[item][index - 1].index) {
                                    rc = datas[item][index - 1][wkCodes[1]];
                                }
                            });
                            flg = true;
                        } else if (wkCodes[0] === '旧') {
                            // バックアップの場合
                            Object.keys(datas).forEach((item) => {
                                if (item === 'pattern' && index === datas[item][index - 1].index) {
                                    rc = datas[item][index - 1]['OLD'][wkCodes[1]];
                                }
                            });
                            flg = true;
                        }
                    }
                }

                // 通常のコードの場合
                if (!flg) {
                    rc = datas[code] ?? '';
                }
                return rc;
            };

            /**
             * コードからデータを取得する
             * @param {String} code
             * @return {object} datas
             */
            const selectedStaff = (code, datas) => {
                let str = code.split('_');
                let num = Number(str[2]); // 数値のみ取得
                let rc = '';
                if (str.length === 3) {
                    rc = datas['pattern'][num - 1][str[1]];
                }

                return rc;
            };

            /**
             * コードからバックアップのデータを取得する
             * @param {String} code
             * @return {object} datas
             */
            const getBackupCode = (code, datas) => {
                //旧担当者コード名1:
                let str = code.replace(/\d+/g, ''); // 数値部分削除
                const num = Number(code.match(/\d+/)); // 数値のみ取得

                str = str.replace('旧', '');
                let rc = '';
                Object.keys(datas).forEach((item) => {
                    if (item === 'OLD' && num === datas[item].index) {
                        rc = datas[item].datas[str];
                    }
                });

                return rc;
            };

            /**
             * バックアップの有無を判定する
             * @param {String} code
             * @return {boolean} rc true:バックアップデータあり、false:バックアップデータなし
             */
            const isBackup = (code) => {
                let rc = false;
                const str = code.split('_'); // 数値部分削除
                if (str.length !== 3) return rc;
                if (str[0] === '旧' && STATE.patternNames.names[Number(str[2]) - 1].backupDispFlg) {
                    rc = true;
                }

                return rc;
            };

            /**
             * ソート用関数
             * @param {String} code フィールドコード
             * @param {boolean} isAsc true:昇順、false:降順
             */
            const sortData = (code, isAsc) => {
                const codeSegments = code.split('_');
                const isPatternField = codeSegments.length === 3 && (codeSegments[0] === '新' || codeSegments[0] === '旧');

                STATE.listData.datas = [...STATE.listData.datas].sort((a, b) => {
                    let valA, valB;

                    if (isPatternField) {
                        // パターンフィールドの場合
                        const patternIndex = parseInt(codeSegments[2]) - 1;
                        const fieldKey = codeSegments[1];
                        const isBackupField = codeSegments[0] === '旧';

                        if (isBackupField) {
                            // バックアップフィールドの場合
                            valA = a.datas?.['pattern']?.[patternIndex]?.['OLD']?.[fieldKey] ?? '';
                            valB = b.datas?.['pattern']?.[patternIndex]?.['OLD']?.[fieldKey] ?? '';
                        } else {
                            // 通常のパターンフィールドの場合
                            valA = a.datas?.['pattern']?.[patternIndex]?.[fieldKey] ?? '';
                            valB = b.datas?.['pattern']?.[patternIndex]?.[fieldKey] ?? '';
                        }
                    } else {
                        // 通常フィールドの場合
                        valA = a.datas?.[code] ?? '';
                        valB = b.datas?.[code] ?? '';
                    }

                    // 数値かどうかをチェック
                    const numA = parseFloat(valA);
                    const numB = parseFloat(valB);
                    const isNumeric = !isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '';

                    if (isNumeric) {
                        // 数値の場合
                        return isAsc ? numA - numB : numB - numA;
                    } else {
                        // 文字列の場合（空文字列は最後にソート）
                        const strA = String(valA);
                        const strB = String(valB);

                        // 空文字列の処理
                        if (strA === '' && strB === '') return 0;
                        if (strA === '') return isAsc ? 1 : -1;
                        if (strB === '') return isAsc ? -1 : 1;

                        // 日本語対応のロケール比較
                        return isAsc ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
                        //? strA.localeCompare(strB, 'ja', { numeric: true, sensitivity: 'base' })
                        //: strB.localeCompare(strA, 'ja', { numeric: true, sensitivity: 'base' });
                    }
                });
            };

            onMounted(async () => {
                // 初期表示

                // 取得フィールド作成
                let fields = [];
                let items = [];
                const keys = Object.keys(CONF).filter((key) => key !== 'apps' && key !== 'radOrg');
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
                    acc[item.code] = '';
                    return acc;
                }, {});

                // id revision追加
                fields.push(EXCEPT_ITEMS[0]);
                fields.push(EXCEPT_ITEMS[1]);

                let itemCount = 0; // 余分な項目をカウント
                // 担当者コード　副担当者コードがない場合は追加
                if (fields.indexOf(PATTERN_NAME_ITEMS[1].cd) === -1) {
                    fields.push(PATTERN_NAME_ITEMS[1].cd);
                    PATTERN_NAME_ITEMS[1].label = PATTERN_NAME_ITEMS[1].cd;
                } else {
                    itemCount++;
                }
                if (fields.indexOf(PATTERN_NAME_ITEMS[3].cd) === -1) {
                    fields.push(PATTERN_NAME_ITEMS[3].cd);
                    PATTERN_NAME_ITEMS[3].label = PATTERN_NAME_ITEMS[3].cd;
                } else {
                    itemCount++;
                }
                STATE.listData.items.push({ code: SELECTTYPE_NAME_ITEMS[0].cd, label: SELECTTYPE_NAME_ITEMS[0].label, type: '' });
                STATE.listData.items.push({ code: SELECTTYPE_NAME_ITEMS[1].cd, label: SELECTTYPE_NAME_ITEMS[1].label, type: '' });
                STATE.filters[SELECTTYPE_NAME_ITEMS[0].cd] = '';
                STATE.filters[SELECTTYPE_NAME_ITEMS[1].cd] = '';

                // 担当者　副担当者　が選択されていた場合
                let count = fields.filter((field) => field === PATTERN_NAME_ITEMS[2].cd).length;
                if (count > 1) {
                    itemCount++;
                }
                count = fields.filter((field) => field === PATTERN_NAME_ITEMS[4].cd).length;
                if (count > 1) {
                    itemCount++;
                }

                // 顧客コード　顧客名　は必ず追加
                if (fields.indexOf(PATTERN_NAME_ITEMS[5].cd) === -1) {
                    fields.push(PATTERN_NAME_ITEMS[5].cd);
                    PATTERN_NAME_ITEMS[5].label = PATTERN_NAME_ITEMS[5].cd;
                } else {
                    itemCount++;
                }

                if (fields.indexOf(PATTERN_NAME_ITEMS[6].cd) === -1) {
                    fields.push(PATTERN_NAME_ITEMS[6].cd);
                    PATTERN_NAME_ITEMS[6].label = PATTERN_NAME_ITEMS[6].cd;
                } else {
                    itemCount++;
                }
                STATE.listData.items.push({ code: SELECTTYPE_NAME_ITEMS[2].cd, label: SELECTTYPE_NAME_ITEMS[2].label, type: '' });
                STATE.filters[SELECTTYPE_NAME_ITEMS[2].cd] = '';
                //console.log('fields:', fields);

                // 担当者所属　副担当者所属　は必ず追加
                if (fields.indexOf(ORG_ITEM[0]) === -1) {
                    fields.push(ORG_ITEM[0]);
                } else {
                    itemCount++;
                }
                if (fields.indexOf(ORG_ITEM[1]) === -1) {
                    fields.push(ORG_ITEM[1]);
                } else {
                    itemCount++;
                }
                PATTERN_NAME_ITEMS[7].label = PATTERN_NAME_ITEMS[7].cd;
                PATTERN_NAME_ITEMS[8].label = PATTERN_NAME_ITEMS[8].cd;
                PATTERN_NAME_ITEMS[9].label = PATTERN_NAME_ITEMS[9].cd;
                PATTERN_NAME_ITEMS[10].label = PATTERN_NAME_ITEMS[10].cd;
                STATE.listData.items.push({ code: SELECTTYPE_NAME_ITEMS[3].cd, label: SELECTTYPE_NAME_ITEMS[3].label, type: '' });
                STATE.listData.items.push({ code: SELECTTYPE_NAME_ITEMS[4].cd, label: SELECTTYPE_NAME_ITEMS[4].label, type: '' });
                STATE.filters[SELECTTYPE_NAME_ITEMS[3].cd] = '';
                STATE.filters[SELECTTYPE_NAME_ITEMS[4].cd] = '';
                //console.log('fields:', fields);

                // 決算月追加
                if (fields.indexOf(CUSTOMERCHART_FIELD.fiscalMonth.cd) === -1) {
                    fields.push(CUSTOMERCHART_FIELD.fiscalMonth.cd);
                } else {
                    //itemCount++;
                }

                // 項目の並び順を変更する
                // 「顧客名」「担当者」「担当者所属」「副担当者」「副担当者所属」の順序にし、それ以外はこの順序の後に表示する
                const orderKeys = SELECTTYPE_NAME_ITEMS.slice()
                    .sort((a, b) => a.index - b.index)
                    .map((item) => item.cd);
                STATE.listData.items = [...orderKeys.map((key) => STATE.listData.items.find((item) => item.code === key)).filter(Boolean), ...STATE.listData.items.filter((item) => !orderKeys.includes(item.code))];

                // レコード取得
                try {
                    const records = await getRecords(fields, '', '', utils.constants.CUSTOMER_APP_ID);
                    if (!records || records.length === 0) {
                        Swal.fire({
                            title: '取得データーなし',
                            text: '顧客カルテにデータがありません',
                            confirmButtonText: '閉じる',
                        });
                        return;
                    }

                    let items = [];
                    let totalStaff = [];
                    let totalOrg = [];
                    let i = 0;
                    records.forEach((rec) => {
                        items.push({ datas: {} });
                        STATE.listData.items.forEach((item) => {
                            //console.log(item.label);
                            if (utils.common.containsKey(rec, item.code)) {
                                if (Array.isArray(rec[item.code].value) && rec[item.code].value.length === 0) {
                                    // 配列が空だった場合
                                    items[i].datas[item.code] = '';
                                } else {
                                    items[i].datas[item.code] = rec[item.code].value;
                                }
                                //console.log(item.code, ':', rec[item.code].value);
                            } else {
                                items[i].datas[item.code] = '';
                            }
                        });
                        // id 追加
                        items[i].datas[EXCEPT_ITEMS[0]] = rec[EXCEPT_ITEMS[0]].value;
                        // revision 追加
                        items[i].datas[EXCEPT_ITEMS[1]] = rec[EXCEPT_ITEMS[1]].value;

                        // 担当者コード　副担当者コードがなかった場合、追加
                        items[i].datas[PATTERN_NAME_ITEMS[1].cd] = rec[PATTERN_NAME_ITEMS[1].cd].value;

                        items[i].datas[PATTERN_NAME_ITEMS[3].cd] = rec[PATTERN_NAME_ITEMS[3].cd].value;

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
                            // 最初または最後のデータを取得
                            wkcode = rec[ORG_ITEM[0]].value.at(CONF.radOrg).code;
                            wkname = rec[ORG_ITEM[0]].value.at(CONF.radOrg).name;
                        } else {
                            wkcode = '';
                            wkname = '';
                        }
                        items[i].datas[PATTERN_NAME_ITEMS[7].cd] = wkcode; // 所属はコード
                        items[i].datas[PATTERN_NAME_ITEMS[8].label] = wkname; // 所属は名称
                        if (wkcode !== '' && wkname !== '') {
                            //items[i].datas[SELECTTYPE_NAME_ITEMS[3].cd] = '[' + wkcode + ']' + wkname;
                            items[i].datas[SELECTTYPE_NAME_ITEMS[3].cd] = wkname;
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
                            items[i].datas[SELECTTYPE_NAME_ITEMS[4].cd] = wkname;
                        } else {
                            items[i].datas[SELECTTYPE_NAME_ITEMS[4].cd] = '';
                        }

                        // 決算月
                        items[i].datas[CUSTOMERCHART_FIELD.fiscalMonth.cd] = rec[CUSTOMERCHART_FIELD.fiscalMonth.cd]?.value ?? -1;

                        // 担当者集計
                        const staffCode = items[i].datas[PATTERN_NAME_ITEMS[1].cd]; // 担当者コード
                        const staffName = items[i].datas[PATTERN_NAME_ITEMS[2].cd]; // 担当者名
                        const orgCode = items[i].datas[PATTERN_NAME_ITEMS[7].cd]; // 担当者所属コード
                        const orgName = items[i].datas[PATTERN_NAME_ITEMS[8].cd]; // 担当者所属名
                        const fiscalMonth = parseInt(items[i].datas[CUSTOMERCHART_FIELD.fiscalMonth.cd]) || 0; // 決算月

                        // 既存の担当者 所属データを検索
                        let matchStaff = totalStaff.find((data) => data.code === staffCode);
                        let matchOrg = totalOrg.find((data) => data.code === orgCode);

                        if (matchStaff) {
                            // 既存担当者の場合、該当月のカウントを増やす
                            let monthData = matchStaff.datas.find((d) => d.month === fiscalMonth);
                            if (monthData) {
                                monthData.count++;
                            } else {
                                matchStaff.datas.push({ month: fiscalMonth, count: 1 });
                            }
                        } else {
                            // 新規担当者の場合、新しいエントリを作成
                            totalStaff.push({
                                code: staffCode,
                                name: staffName,
                                datas: [{ month: fiscalMonth, count: 1 }],
                            });
                        }

                        if (matchOrg) {
                            // 既存所属の場合、該当月のカウントを増やす
                            let monthData = matchOrg.datas.find((d) => d.month === fiscalMonth);
                            if (monthData) {
                                monthData.count++;
                            } else {
                                matchOrg.datas.push({ month: fiscalMonth, count: 1 });
                            }
                        } else {
                            // 新規所属の場合、新しいエントリを作成
                            totalOrg.push({
                                code: orgCode,
                                name: orgName,
                                datas: [{ month: fiscalMonth, count: 1 }],
                            });
                        }

                        i++;
                    });

                    STATE.listData.datas = items;
                    STATE.itemLength = STATE.listData.items.length - itemCount - 2;
                    //STATE.itemLength = STATE.listData.items.length - 2;
                    STATE.listTotal = { staff: totalStaff, org: totalOrg };

                    console.log('records:', records);
                } catch (e) {
                    console.log('項目取得失敗！:onMounted:', e.error);
                }

                // 担当者取得
                let selectStaffs = [];
                //console.log('wk:', wk);
                try {
                    const staffs = await getRecords('', '', '', utils.constants.STAFF_APP_ID);
                    if (staffs || staffs.length > 0) {
                        // 担当者　所属
                        // STAFFMASTER_FIELDに対応するデータを取得
                        const filtered = Object.fromEntries(Object.entries(STAFFMASTER_FIELD).filter(([key]) => key !== 'id' && key !== 'revision'));
                        selectStaffs = staffs.map((staffRec) => {
                            const obj = {};
                            Object.entries(filtered).forEach((key) => {
                                obj[key[1].cd] = staffRec[key[1].cd].value;
                            });
                            obj[STAFFMASTER_FIELD.id.readCd] = staffRec[STAFFMASTER_FIELD.id.readCd].value;
                            obj[STAFFMASTER_FIELD.revision.readCd] = staffRec[STAFFMASTER_FIELD.revision.readCd].value;
                            return obj;
                        });

                        // 現役担当者のみ取得
                        // 施設・備品キーの値が配列データの「施設・備品」を除いたデータをfilteredStaffsに代入
                        let filteredStaffs = Array.isArray(selectStaffs) ? selectStaffs.filter((staff) => !(Array.isArray(staff['施設・備品']) && staff['施設・備品'].length > 0)) : [];
                        // 非表示フラグキーの値が配列データでないもののみを取得
                        filteredStaffs = Array.isArray(filteredStaffs) ? filteredStaffs.filter((staff) => !(Array.isArray(staff['非表示フラグ']) && staff['非表示フラグ'].length > 0)) : [];
                        // 退社日キーがnull, 空文字, undefinedの場合のみ抽出
                        //filteredStaffs = Array.isArray(filteredStaffs) ? filteredStaffs.filter((staff) => staff['退社日'] === null || staff['退社日'] === '' || typeof staff['退社日'] === 'undefined') : [];
                        // 退社日キーが現在日付より未来の日付のものを抽出
                        filteredStaffs = Array.isArray(filteredStaffs)
                            ? filteredStaffs.filter((staff) => {
                                  if (staff['退社日']) {
                                      const wkDate = staff['退社日'].replace(/-/g, '');
                                      const today = TODAY.toFormat('yyyyMMdd');
                                      if (Number(wkDate) <= Number(today)) {
                                          return false;
                                      }
                                  }
                                  return true;
                              })
                            : [];
                        STATE.selectStaffs = filteredStaffs;

                        // 所属
                    } else {
                        console.log('staffsデータがありません');
                    }

                    // テスト用データ
                    /*STATE.listData.datas.push({
                        datas: {
                            顧客コード: '999',
                            顧客コード名: '[999]顧客テスト１',
                            顧客名: '顧客テスト１',
                            担当者コード: '99999',
                            担当者: 'テスト太郎',
                            担当者コード名: '[99999]テスト太郎',
                            担当者所属: 'テスト部',
                            担当者所属コード: '99999',
                            担当者所属コード名: '[99999]テスト部',
                            副担当者コード: '99999',
                            副担当者: 'テスト太郎',
                            副担当者コード名: '[99999]テスト太郎',
                            副担当者所属: 'テスト部',
                            副担当者所属コード: '99999',
                            副担当者所属コード名: '[99999]テスト部',
                        },
                    });*/
                    /*STATE.listData.datas.push({
                        datas: {
                            顧客コード: '998',
                            顧客コード名: '[998]顧客テスト２',
                            顧客名: '顧客テスト２',
                            担当者コード: '99998',
                            担当者: 'テスト花子',
                            担当者コード名: '[99998]テスト花子',
                            担当者所属: 'テスト２部',
                            担当者所属コード: '99998',
                            担当者所属コード名: '[99998]テスト２部',
                            副担当者コード: '99998',
                            副担当者: 'テスト花子',
                            副担当者コード名: '[99998]テスト花子',
                            副担当者所属: 'テスト２部',
                            副担当者所属コード: '99998',
                            副担当者所属コード名: '[99998]テスト２部',
                        },
                    });*/
                    //STATE.listData.datas[0].datas.担当者コード = '99999'; // テスト用
                    //STATE.listData.datas[0].datas.担当者 = 'テスト太郎'; // テスト用
                    //}
                } catch (e) {
                    console.log('担当者取得失敗！:onMounted:', e.error);
                }

                // 担当者整合性チェック
                let isChange = false;
                STATE.listData.datas.forEach((record) => {
                    const staffCode = [record.datas[PATTERN_NAME_ITEMS[1].cd], record.datas[PATTERN_NAME_ITEMS[3].cd]];
                    const staffName = [record.datas[PATTERN_NAME_ITEMS[2].cd], record.datas[PATTERN_NAME_ITEMS[4].cd]];
                    const orgCode = [record.datas[PATTERN_NAME_ITEMS[7].cd], record.datas[PATTERN_NAME_ITEMS[9].cd]];
                    const orgName = [record.datas[PATTERN_NAME_ITEMS[8].cd], record.datas[PATTERN_NAME_ITEMS[10].cd]];
                    const staffId = ['staff', 'substaff'];
                    const staffOrgId = ['staffOrg', 'substaffOrg'];

                    for (let i = 0; i < 2; i++) {
                        const matchedStaffCd = selectStaffs.find((staff) => staff[STAFFMASTER_FIELD.staffCode.cd] === staffCode[i]);
                        if (matchedStaffCd) {
                            // 担当者コードが見つかった場合

                            if (matchedStaffCd[STAFFMASTER_FIELD.staff.cd] !== staffName[i]) {
                                // 担当者名が相違の場合
                                console.log(`担当者名不整合:コード=${staffCode[i]} 登録名=${staffName[i]} マスタ名=${matchedStaffCd[STAFFMASTER_FIELD.staff.cd]}`);
                                record.datas.className = { [staffId[i]]: { back: CUSTOMER_CHANGE_BACKCOLOR } };
                                isChange = true;
                            }

                            let wkOrgName = matchedStaffCd[STAFFMASTER_FIELD.organization.cd].find((org) => org.name === orgName[i])?.name;
                            // テスト用
                            /*if (record.datas[SELECTTYPE_NAME_ITEMS[2].cd] === '[00004]ブランド株式会社') {
                                wkOrgName = undefined;
                            }
                            if (record.datas[SELECTTYPE_NAME_ITEMS[2].cd] === '[00007]一般社団法人ヘルスケアサポート') {
                                wkOrgName = undefined;
                            }*/

                            if (!wkOrgName) {
                                // 所属名が見つからなかった場合
                                console.log(`担当者所属不整合:コード=${staffCode[i]} 登録所属コード=${orgCode[i]} マスタ所属コード=${matchedStaffCd[STAFFMASTER_FIELD.organization.cd]}`);
                                // 所属列変更
                                if (!record.datas.className) record.datas.className = {};
                                record.datas.className[staffOrgId[i]] = { back: CUSTOMER_CHANGE_BACKCOLOR };
                                isChange = true;
                            }

                            let wkRetireDate = matchedStaffCd[STAFFMASTER_FIELD.retireDate.cd];
                            let str = '';
                            if (wkRetireDate && wkRetireDate !== '') {
                                wkRetireDate = wkRetireDate.replace(/-/g, '');
                                const today = TODAY.toFormat('yyyyMMdd');
                                if (Number(wkRetireDate) <= Number(today)) {
                                    // 退社日が有る場合
                                    console.log(`担当者退社済み:コード=${staffCode[i]} 登録名=${staffName[i]} 退社日=${wkRetireDate}`);
                                    // 担当者列変更
                                    if (!record.datas.className) record.datas.className = {};
                                    if (!record.datas.className[staffId[i]]) record.datas.className[staffId[i]] = {};
                                    record.datas.className[staffId[i]].font = CUSTOMER_CHANGE_FONTCOLOR;
                                    str = '退社';
                                }
                            }

                            let wkHiddenFlag = matchedStaffCd[STAFFMASTER_FIELD.hiddenFlag.cd];
                            if (wkHiddenFlag[0] === STAFFMASTER_FIELD.hiddenFlag.value[0]) {
                                // 非表示がONの場合
                                console.log(`非表示ON:コード=${staffCode[i]} 登録名=${staffName[i]} 非表示=${wkHiddenFlag}`);
                                // 担当者列変更
                                if (!record.datas.className) record.datas.className = {};
                                if (!record.datas.className[staffId[i]]) record.datas.className[staffId[i]] = {};
                                record.datas.className[staffId[i]].font = CUSTOMER_CHANGE_FONTCOLOR;
                                if (str !== '') {
                                    str = str + '・非表示';
                                } else {
                                    str = '非表示';
                                }
                            }

                            if (str !== '') {
                                record.datas[SELECTTYPE_NAME_ITEMS[i].cd] += ` (${str})`;
                                isChange = true;
                            }
                        } else {
                            // 担当者コードが見つからなかった場合、担当者名で検索
                            const matchedStaffNm = selectStaffs.find((staff) => staff[STAFFMASTER_FIELD.staff.cd] === staffName[i]);
                            if (matchedStaffNm) {
                                // 担当者名が見つかった場合
                                console.log(`担当者コード不整合:コード=${staffCode[i]} 登録名=${staffName[i]} マスタコード=${matchedStaffNm[STAFFMASTER_FIELD.staffCode.cd]}`);
                                // 担当者列変更
                                if (!record.datas.className) record.datas.className = {};
                                record.datas.className[staffId[i]] = { back: CUSTOMER_CHANGE_BACKCOLOR };
                                isChange = true;

                                let wkOrgName = matchedStaffNm[STAFFMASTER_FIELD.organization.cd].find((org) => org.name === orgName[i])?.name;
                                // テスト用
                                /*if (record.datas[SELECTTYPE_NAME_ITEMS[2].cd] === '[00018]新橋歯科医院') {
                                    wkOrgName = undefined;
                                }
                                if (record.datas[SELECTTYPE_NAME_ITEMS[2].cd] === '[00011]株式会社ビジョンエアロスペース') {
                                    wkOrgName = undefined;
                                }*/

                                if (!wkOrgName) {
                                    // 所属名が相違の場合
                                    console.log(`担当者所属不整合:コード=${staffCode[i]} 登録所属コード=${orgCode[i]} マスタ所属コード=${matchedStaffNm[STAFFMASTER_FIELD.organization.cd]}`);
                                    // 所属列変更
                                    if (!record.datas.className) record.datas.className = {};
                                    record.datas.className[staffOrgId[i]] = { back: CUSTOMER_CHANGE_BACKCOLOR };
                                }

                                let wkRetireDate = matchedStaffNm[STAFFMASTER_FIELD.retireDate.cd];
                                let str = '';
                                if (wkRetireDate && wkRetireDate !== '') {
                                    wkRetireDate = wkRetireDate.replace(/-/g, '');
                                    const today = TODAY.toFormat('yyyyMMdd');
                                    if (Number(wkRetireDate) <= Number(today)) {
                                        // 退社日が有る場合
                                        console.log(`担当者退社済み:コード=${staffCode[i]} 登録名=${staffName[i]} 退社日=${wkRetireDate}`);
                                        // 担当者列変更
                                        if (!record.datas.className) record.datas.className = {};
                                        if (!record.datas.className[staffId[i]]) record.datas.className[staffId[i]] = {};
                                        record.datas.className[staffId[i]].font = CUSTOMER_CHANGE_FONTCOLOR;
                                        str = '退社';
                                    }
                                }

                                let wkHiddenFlag = matchedStaffNm[STAFFMASTER_FIELD.hiddenFlag.cd];
                                if (wkHiddenFlag[0] === STAFFMASTER_FIELD.hiddenFlag.value[0]) {
                                    // 非表示がONの場合
                                    console.log(`非表示ON:コード=${staffCode[i]} 登録名=${staffName[i]} 非表示=${wkHiddenFlag}`);
                                    // 担当者列変更
                                    if (!record.datas.className) record.datas.className = {};
                                    if (!record.datas.className[staffId[i]]) record.datas.className[staffId[i]] = {};
                                    record.datas.className[staffId[i]].font = CUSTOMER_CHANGE_FONTCOLOR;
                                    if (str !== '') {
                                        str = str + '・非表示';
                                    } else {
                                        str = '非表示';
                                    }
                                }
                                if (str !== '') {
                                    record.datas[SELECTTYPE_NAME_ITEMS[i].cd] += ` (${str})`;
                                    isChange = true;
                                }
                            }
                        }
                    }
                });

                if (isChange) {
                    Swal.fire({
                        title: '担当者整合性チェック',
                        text: '担当者マスタと情報が異なるものがあります。',
                        confirmButtonText: '閉じる',
                    });
                }

                // stickyヘッダー対応
                nextTick(() => {
                    bizupUtil.common.setStickyHeaderHeight(CONTAINER_ID, '');
                });
                console.log('STATE:', STATE);
                //totalStaff();
            });

            return {
                STATE,
                CONF,
                //selectedStaffName,
                //customFilter,
                addPattern,
                openPattern,
                filteredRows,
                getUniqueOptions,
                getStaffList,
                setNewLabel,
                isVisibleItem,
                isSelectType,
                isSelectData,
                changeStaff,
                savePattern,
                replaceAllPattern,
                applyCustomerChartPattern,
                showBackupPattern,
                restoreBackupPattern,
                setTitleBackColor,
                setItemBackColor,
                setItemFontColor,
                totalCustomersPerStaff,
                totalCustomersPer,
                totalStaff,
                generateHref,
                getBackupCode,
                getStaffData,
                selectedStaff,
                isBackup,
                handleCheckboxChange,
                sortData,
                checkStaffConsistency,
            };
        },
        template: /* HTML */ `
            <div id="bz_header">
                <ul>
                    <li>顧客一覧のテーブル（tableFieldsのフィールド）と担当者フィールド（staffFieldのフィールド）</li>
                    <li>選択したパターンの担当者（staffFieldの分だけ用意）</li>
                    <li>現在と表示中パターンの担当者の顧客数・所属組織の顧客数※複数組織に所属している場合は要検討</li>
                    <li>適用した際は必ず適用日時と適用前のバックアップを取得・JSONに保存</li>
                </ul>
                <button @click="addPattern" class="bz_bt_def">新規パターン追加</button>
                <button @click="openPattern([])" class="bz_bt_def">パターンを開く</button>
                <button @click="totalCustomersPer(0)" class="bz_bt_def">担当者集計</button>
                <button @click="totalCustomersPer(1)" class="bz_bt_def">所属集計</button>
            </div>
            <div id="bz_events_main_container">
                <table class="bz_table_def">
                    <thead>
                        <pattern-set @savePattern="savePattern" @replaceAllPattern="replaceAllPattern" @applyCustomerChartPattern="applyCustomerChartPattern" @showBackupPattern="showBackupPattern" @restoreBackupPattern="restoreBackupPattern" :pattern="STATE.patternNames.names" :colspan="STATE.itemLength?STATE.itemLength:0" />

                        <tr>
                            <template v-for="(field, index) in STATE.listData.items" :key="field">
                                <th v-if="isVisibleItem(field.code)" :style="{backgroundColor:setTitleBackColor(field.code)}">
                                    <div>
                                        {{ setNewLabel(field.label) }}
                                        <span class="sort-btn" @click="sortData(field.code,true)">▲</span>
                                        <span class="sort-btn" @click="sortData(field.code,false)">▼</span>
                                    </div>
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
                                    <td v-if="isVisibleItem(key.code)" :style="{backgroundColor:setItemBackColor(key.code,field.datas) , color:setItemFontColor(key.code,field.datas)}">
                                        <template v-if="isSelectData(key.code,'pattern')"
                                            >{{STATE.patternNames.noNow}}<!---->
                                            <select :value="selectedStaff(key.code,field.datas)" @change="changeStaff(field.datas.$id,$event,key.code)">
                                                <option v-for="option in getUniqueOptions(key.code)" :key="option.value" :value="option.label">{{option.label}}</option>
                                                <option value="">未設定</option>
                                            </select>
                                        </template>

                                        <template v-else>
                                            <template v-if="key.code==='顧客コード名'">
                                                <span :title="'顧客コード名'">
                                                    <a class="no-color-change underline cursor-pointer" :href="generateHref(field.datas.$id)" target="_blank"> {{field.datas[key.code]}} </a>
                                                </span>
                                            </template>
                                            <template v-else>{{getStaffData(key.code,field.datas)}} </template>
                                        </template>
                                    </td>
                                </template>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>

            <!--<div>
                CONF：
                <pre>{{ CONF }}</pre>
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
            </div>-->
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
