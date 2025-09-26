/**
 * BIZUP 担当者変更プラグイン
 * Copyright © 2025 Bizup
 */
(function (PLUGIN_ID) {
    ('use strict');

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
    const PATTERN_TITLE_COLOR = ['#FFFF00', '#64D2F0', '#92D050']; // パターンタイトルカラー
    const PATTERN_ITEMS_COLOR = ['#FFF2CC', '#DDEBF7', '#E2EFDA']; // 担当者選択カラー
    const PATTERN_CHANGE_COLOR = '#FFC000'; // 項目相違カラー

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
        hiddenFlag: { cd: '非表示フラグ', type: 'CHECK_BOX', name: '非表示フラグ' },
    };

    // 顧客カルテのフィールド定義（appID:85）
    const CUSTOMERCHART_FIELD = {
        id: { readCd: '$id', writeCd: 'id', type: '__ID__', name: '' },
        revision: { readCd: '$revision', writeCd: 'revision', type: '__REVISION__', name: '' },
        staff: { cd: '担当者', type: 'SINGLE_LINE_TEXT', name: '担当者' },
        subStaff: { cd: '副担当者', type: 'SINGLE_LINE_TEXT', name: '副担当者' },
        fiscalMonth: { cd: 'ドロップダウン_決算月', type: 'DROP_DOWN', name: '決算月' },
    };

    // 担当者変更のフィールド定義（appID:324）
    const STAFF_CHANGE_FIELDCD = {
        jsonData: { cd: 'JSON', type: 'MULTI_LINE_TEXT', name: 'JSON' },
        patternName: { cd: 'パターン名', type: 'SINGLE_LINE_TEXT', name: 'パターン名' },
        appliedDate: { cd: '適用日', type: 'DATETIME', name: '適用日' },
        id: { readCd: '$id', writeCd: 'id', type: '__ID__', name: '' },
        revision: { readCd: '$revision', writeCd: 'revision', type: '__REVISION__', name: '' },
    };

    // パターン追加テーブル
    const setPattern = {
        props: ['pattern', 'colspan'],
        emits: ['savePattern', 'replaceAllPattern', 'applyCustomerChartPattern'],
        template: `
            <tr v-if="pattern && pattern.length!==0">
                <th :colspan="colspan"></th>
                <th v-for="(item,index) in pattern" :key="index" colspan="4" :style="{ backgroundColor: item.titleColor }">
                        {{item.name}} 
                        <button @click="replaceAll(item)" class="bz_bt_def">担当者一括置換</button>
                        <button @click="save(item)" class="bz_bt_def">この設定を保存</button>
                        <button @click="apply(item)" class="bz_bt_def">顧客カルテに適用</button>
                </th>
            </tr>
        `,
        methods: {
            save(item) {
                this.$emit('savePattern', item);
            },
            replaceAll(item) {
                this.$emit('replaceAllPattern', item);
            },
            apply(item) {
                this.$emit('applyCustomerChartPattern', item);
            },
        },
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
                patternNames: { len: 0, index: 1, maxlength: MAX_PATTERN, names: [] },
                selectStaffs: [], // 担当者マスタの全データ
                testSelectedStaff: null,
                selectedStaff: null,
                filters: {}, // 絞り込み条件
                itemLength: 0, // 表示項目数
                listTotal: {}, // 集計データ
            });

            // 項目名除外
            const EXCEPT_ITEMS = ['$id', '$revision'];
            // 所属
            const ORG_ITEM = ['チーム', '副チーム'];

            // パターン名登録項目（コードと名称をひとつにした場合、別々にデータも保持するために持っている）
            // データが汚すぎる→下のコード＋名称とくっつけて、綺麗に一つにしたい
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

            // コードと名称をひとつにまとめる
            const SELECTTYPE_NAME_ITEMS = [
                { cd: '担当者コード名', type: '', label: ' 担当者名', index: 1 },
                { cd: '副担当者コード名', type: '', label: ' 副担当者名', index: 3 },
                { cd: '顧客コード名', type: '', label: '顧客名', index: 0 },
                { cd: '担当者所属コード名', type: '', label: '担当者所属', index: 2 },
                { cd: '副担当者所属コード名', type: '', label: '副担当者所属', index: 4 },
            ];

            // 配列番号
            const arrayNo = { current: 0, pattern1: 1, pattern2: 2, pattern3: 3 };

            const CONF = CONFDATA.CONFIG_DATA ? JSON.parse(CONFDATA.CONFIG_DATA) : '';

            /**
             * 担当者、決算月ごとの集計
             * @returns {array} totalData 集計データ
             */
            const totalStaff = computed(() => {
                let totalData = [];
                // 空の配列を用意
                let patternList = Array.from({ length: STATE.patternNames.len }, () => []);
                STATE.listData.datas.forEach((item) => {
                    const fiscalMonth = parseInt(item.datas[CUSTOMERCHART_FIELD.fiscalMonth.cd]) || 0; // 決算月

                    for (let i = 0; i < STATE.patternNames.len; i++) {
                        const pattern = STATE.patternNames.names[i];
                        // 各パターンごとの集計処理

                        // 項目名取得
                        const itemCode = '新' + PATTERN_NAME_ITEMS[1].cd + pattern.index; // 担当者コード
                        const itemName = '新' + PATTERN_NAME_ITEMS[2].cd + pattern.index; // 担当者名

                        const staffCode = item.datas[itemCode]; // 担当者コード
                        const staffName = item.datas[itemName]; // 担当者名

                        // 既存の担当者データを検索
                        let matchData = patternList[i].find((data) => data.code === staffCode);

                        if (matchData) {
                            // 既存担当者の場合、該当月のカウントを増やす
                            let monthData = matchData.datas.find((d) => d.month === fiscalMonth);
                            if (monthData) {
                                monthData.count++;
                            } else {
                                matchData.datas.push({ month: fiscalMonth, count: 1 });
                            }
                        } else {
                            // 新規担当者の場合、新しいエントリを作成
                            patternList[i].push({
                                code: staffCode,
                                name: staffName,
                                datas: [{ month: fiscalMonth, count: 1 }],
                            });
                        }
                    }
                });
                totalData = patternList;
                //console.log('patternList:', patternList);
                //console.log('totalData:', totalData);
                return totalData;
            });

            const selectedStaffName = computed(() => {
                if (!STATE.testSelectedStaff) return '';
                const staff = STATE.testData.find((s) => s.code === STATE.testSelectedStaff);
                return staff ? staff.name : '';
            });

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
             * @returns {}
             */
            const validator = (value, label) => {
                if (!value || String(value).trim() === '') {
                    return label + 'を入力してください';
                }
                return null;
            };

            /**
             * 行選択チェック
             * @param {String} value 選択値
             * @returns {}
             */
            const validatorRow = (value) => {
                if (!value || String(value).trim() === '') {
                    return 'パターンを選択してください';
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
                const staff = ['新' + SELECTTYPE_NAME_ITEMS[0].cd + cnt, '新' + PATTERN_NAME_ITEMS[1].cd + cnt, '新' + PATTERN_NAME_ITEMS[2].cd + cnt];
                const subStaff = ['新' + SELECTTYPE_NAME_ITEMS[1].cd + cnt, '新' + PATTERN_NAME_ITEMS[3].cd + cnt, '新' + PATTERN_NAME_ITEMS[4].cd + cnt];
                const department = ['新' + SELECTTYPE_NAME_ITEMS[3].cd + cnt, '新' + PATTERN_NAME_ITEMS[7].cd + cnt, '新' + PATTERN_NAME_ITEMS[8].cd + cnt];
                const subDepartment = ['新' + SELECTTYPE_NAME_ITEMS[4].cd + cnt, '新' + PATTERN_NAME_ITEMS[9].cd + cnt, '新' + PATTERN_NAME_ITEMS[10].cd + cnt];

                STATE.listData.items.push({ code: staff[0], label: SELECTTYPE_NAME_ITEMS[0].label, type: '' });
                STATE.listData.items.push({ code: department[0], label: SELECTTYPE_NAME_ITEMS[3].label, type: '' });
                STATE.listData.items.push({ code: subStaff[0], label: SELECTTYPE_NAME_ITEMS[1].label, type: '' });
                STATE.listData.items.push({ code: subDepartment[0], label: SELECTTYPE_NAME_ITEMS[4].label, type: '' });

                const wkStaff = staff[0] + '_' + 'vmodel';
                const wkSubStaff = subStaff[0] + '_' + 'vmodel';
                const wkDepartment = department[0] + '_' + 'vmodel';
                const wkSubDepartment = subDepartment[0] + '_' + 'vmodel';

                // 現役の担当者取得
                const staffsCode = STATE.selectStaffs.map((s) => s[STAFFMASTER_FIELD.staffCode.cd]);
                // 所属コードのみ取得
                //const departmentsCode = STATE.selectStaffs.map((s) => s[STAFFMASTER_FIELD.organization.cd]).map((s) => s[0].code);

                const updatedArrays = STATE.listData.datas.reduce((acc, item) => {
                    // 担当者コードと所属名は対になっているはずなので、担当者コードで現役かどうかをチェック
                    const idxS1 = staffsCode.indexOf(item.datas[PATTERN_NAME_ITEMS[1].cd]); // 担当者コード
                    const idxS2 = staffsCode.indexOf(item.datas[PATTERN_NAME_ITEMS[3].cd]); // 副担当者コード
                    const updatedItem = {
                        ...item,
                        datas: {
                            ...item.datas,
                            [staff[0]]: idxS1 !== -1 ? item.datas[SELECTTYPE_NAME_ITEMS[0].cd] : '', // 担当者
                            [staff[1]]: idxS1 !== -1 ? item.datas[PATTERN_NAME_ITEMS[1].cd] : '',
                            [staff[2]]: idxS1 !== -1 ? item.datas[PATTERN_NAME_ITEMS[2].cd] : '',
                            [wkStaff]: idxS1 !== -1 ? item.datas[SELECTTYPE_NAME_ITEMS[0].cd] : '', // 選択値保存用

                            [subStaff[0]]: idxS2 !== -1 ? item.datas[SELECTTYPE_NAME_ITEMS[1].cd] : '', // 副担当者
                            [subStaff[1]]: idxS2 !== -1 ? item.datas[PATTERN_NAME_ITEMS[3].cd] : '',
                            [subStaff[2]]: idxS2 !== -1 ? item.datas[PATTERN_NAME_ITEMS[4].cd] : '',
                            [wkSubStaff]: idxS2 !== -1 ? item.datas[SELECTTYPE_NAME_ITEMS[1].cd] : '',

                            [department[0]]: idxS1 !== -1 ? item.datas[SELECTTYPE_NAME_ITEMS[3].cd] : '', // 担当者所属
                            [department[1]]: idxS1 !== -1 ? item.datas[PATTERN_NAME_ITEMS[7].cd] : '',
                            [department[2]]: idxS1 !== -1 ? item.datas[PATTERN_NAME_ITEMS[8].cd] : '',
                            [wkDepartment]: idxS1 !== -1 ? item.datas[SELECTTYPE_NAME_ITEMS[3].cd] : '',

                            [subDepartment[0]]: idxS2 !== -1 ? item.datas[SELECTTYPE_NAME_ITEMS[4].cd] : '', // 副担当者所属
                            [subDepartment[1]]: idxS2 !== -1 ? item.datas[PATTERN_NAME_ITEMS[9].cd] : '',
                            [subDepartment[2]]: idxS2 !== -1 ? item.datas[PATTERN_NAME_ITEMS[10].cd] : '',
                            [wkSubDepartment]: idxS2 !== -1 ? item.datas[SELECTTYPE_NAME_ITEMS[4].cd] : '',
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
                });

                // アイテムカラーを追加
                STATE.patternNames.len = cnt;

                // 絞込追加
                STATE.filters[staff[0]] = '';
                STATE.filters[subStaff[0]] = '';
                STATE.filters[department[0]] = '';
                STATE.filters[subDepartment[0]] = '';
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
                    let patterns = [];
                    let tableHtml = '<table id="patternTable" style="width:100%; border-collapse: collapse;">';
                    tableHtml += '<thead><tr>';
                    tableHtml += `<th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; text-align: center;">${label}</th>`;
                    tableHtml += '</tr></thead>';
                    tableHtml += '<tbody>';
                    records.forEach((rec) => {
                        tableHtml += '<tr>';
                        let val = rec[key]?.value ?? '';
                        tableHtml += `<td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${val}</td>`;
                        tableHtml += '</tr>';

                        // JSONデータを取得
                        patterns.push({ name: rec[key].value, jsonData: rec[STAFF_CHANGE_FIELDCD.jsonData.cd]?.value ?? '', id: rec[EXCEPT_ITEMS[0]].value, revision: rec[EXCEPT_ITEMS[1]].value });
                    });
                    tableHtml += '</tbody></table>';
                    tableHtml += '<input type="hidden" id="clickName" name="clickName" value="">';
                    const result = await Swal.fire({
                        title: '取得データ一覧',
                        html: tableHtml,
                        showCancelButton: true,
                        confirmButtonText: '実行',
                        cancelButtonText: 'キャンセル',
                        //inputValidator: (value) => validatorRow(value),
                        didOpen: () => {
                            setupRowClickHighlighting('patternTable');
                        },
                        preConfirm: () => {
                            const value = Swal.getPopup().querySelector('#clickName').value;
                            if (!value || String(value).trim() === '') {
                                Swal.showValidationMessage('パターンを選択してください');
                                return false;
                            }
                        },
                        //width: '20%',
                    });
                    if (result.dismiss === Swal.DismissReason.cancel || result.isConfirmed === false) {
                        // キャンセルの場合
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

                    const wkStaff = staff[0] + '_' + 'vmodel';
                    const wkSubStaff = subStaff[0] + '_' + 'vmodel';
                    const wkDepartment = department[0] + '_' + 'vmodel';
                    const wkSubDepartment = subDepartment[0] + '_' + 'vmodel';

                    // 現役の担当者取得
                    const staffsCode = STATE.selectStaffs.map((s) => s[STAFFMASTER_FIELD.staffCode.cd]);

                    // STATE.listData.datasに追加
                    const updatedArray = STATE.listData.datas.reduce((acc, item) => {
                        // JSONデータから該当IDのデータを取得
                        const matched = clickData.find((data) => data['$id'] === item.datas['$id']);
                        // 担当者コードと所属名は対になっているはずなので、担当者コードで現役かどうかをチェック
                        const idxS1 = staffsCode.indexOf(matched[PATTERN_NAME_ITEMS[1].cd]); // 担当者コード
                        const idxS2 = staffsCode.indexOf(matched[PATTERN_NAME_ITEMS[3].cd]); // 副担当者コード
                        const updatedItem = {
                            ...item,
                            datas: {
                                ...item.datas,
                                [staff[0]]: idxS1 !== -1 ? '[' + matched[PATTERN_NAME_ITEMS[1].cd] + ']' + matched[PATTERN_NAME_ITEMS[2].cd] : '', // 担当者
                                [staff[1]]: idxS1 !== -1 ? matched[PATTERN_NAME_ITEMS[1].cd] : '',
                                [staff[2]]: idxS1 !== -1 ? matched[PATTERN_NAME_ITEMS[2].cd] : '',
                                [wkStaff]: idxS1 !== -1 ? '[' + matched[PATTERN_NAME_ITEMS[1].cd] + ']' + matched[PATTERN_NAME_ITEMS[2].cd] : '', // 選択値保存用

                                [subStaff[0]]: idxS2 !== -1 ? '[' + matched[PATTERN_NAME_ITEMS[3].cd] + ']' + matched[PATTERN_NAME_ITEMS[4].cd] : '', // 副担当者
                                [subStaff[1]]: idxS2 !== -1 ? matched[PATTERN_NAME_ITEMS[3].cd] : '',
                                [subStaff[2]]: idxS2 !== -1 ? matched[PATTERN_NAME_ITEMS[4].cd] : '',
                                [wkSubStaff]: idxS2 !== -1 ? '[' + matched[PATTERN_NAME_ITEMS[3].cd] + ']' + matched[PATTERN_NAME_ITEMS[4].cd] : '',

                                [department[0]]: idxS1 !== -1 ? '[' + matched[PATTERN_NAME_ITEMS[7].cd] + ']' + matched[PATTERN_NAME_ITEMS[8].cd] : '', // 担当者所属
                                [department[1]]: idxS1 !== -1 ? matched[PATTERN_NAME_ITEMS[7].cd] : '',
                                [department[2]]: idxS1 !== -1 ? matched[PATTERN_NAME_ITEMS[8].cd] : '',
                                [wkDepartment]: idxS1 !== -1 ? '[' + matched[PATTERN_NAME_ITEMS[7].cd] + ']' + matched[PATTERN_NAME_ITEMS[8].cd] : '',

                                [subDepartment[0]]: idxS2 !== -1 ? '[' + matched[PATTERN_NAME_ITEMS[9].cd] + ']' + matched[PATTERN_NAME_ITEMS[10].cd] : '', // 副担当者所属
                                [subDepartment[1]]: idxS2 !== -1 ? matched[PATTERN_NAME_ITEMS[9].cd] : '',
                                [subDepartment[2]]: idxS2 !== -1 ? matched[PATTERN_NAME_ITEMS[10].cd] : '',
                                [wkSubDepartment]: idxS2 !== -1 ? '[' + matched[PATTERN_NAME_ITEMS[9].cd] + ']' + matched[PATTERN_NAME_ITEMS[10].cd] : '',
                            },
                        };
                        acc.push(updatedItem);
                        return acc;
                    }, []);
                    STATE.listData.datas = updatedArray;

                    // パターン追加
                    STATE.patternNames.names.push({
                        index: cnt,
                        name: STATE.listDataPattern.clickName,
                        id: STATE.listDataPattern.datas[STATE.listDataPattern.clickNo].id,
                        revision: STATE.listDataPattern.datas[STATE.listDataPattern.clickNo].revision,
                        titleColor: PATTERN_TITLE_COLOR[cnt - 1],
                        itemsColor: PATTERN_ITEMS_COLOR[cnt - 1], // アイテムカラーを追加
                    });
                    STATE.patternNames.len = cnt;

                    // 絞込追加
                    STATE.filters[staff[0]] = '';
                    STATE.filters[subStaff[0]] = '';
                    STATE.filters[department[0]] = '';
                    STATE.filters[subDepartment[0]] = '';
                } catch (error) {
                    console.error('openPattern取得失敗:', error.error);
                }
            };

            /**
             * 顧客カルテに適用
             */
            const applyCustomerChartPattern = async (item) => {
                // データのバックアップ（レコード登録失敗時に元に戻すため）
                const datas = STATE.listData.datas;

                // 更新日時作成
                luxon.Settings.defaultLocale = 'ja';
                const updatedAt = luxon.DateTime.now().toUTC().toISO();

                // バックアップ用
                const backupStaff = [
                    PATTERN_NAME_ITEMS[1].cd + '_OLD', // 担当者コード
                    PATTERN_NAME_ITEMS[2].cd + '_OLD', // 担当者名
                    PATTERN_NAME_ITEMS[7].cd + '_OLD', // 担当者所属コード
                    PATTERN_NAME_ITEMS[8].cd + '_OLD', // 担当者所属名
                ];
                const backupSubStaff = [
                    PATTERN_NAME_ITEMS[3].cd + '_OLD', // 副担当者コード
                    PATTERN_NAME_ITEMS[4].cd + '_OLD', // 副担当者名
                    PATTERN_NAME_ITEMS[9].cd + '_OLD', // 副担当者所属コード
                    PATTERN_NAME_ITEMS[10].cd + '_OLD', // 副担当者所属名
                ];

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

                STATE.listData.datas.forEach((data) => {
                    // 以前データをバックアップする
                    // 担当者
                    for (let i = 0; i < backupStaff.length; i++) {
                        data.datas[backupStaff[i]] = data.datas[staff[i]];
                    }
                    // 副担当者
                    for (let i = 0; i < backupSubStaff.length; i++) {
                        data.datas[backupSubStaff[i]] = data.datas[subStaff[i]];
                    }
                });

                // 顧客カルテ更新（担当者が変更になったものだけを更新する）
                // 項目名を取得
                const staffCode = ['新' + PATTERN_NAME_ITEMS[1].cd + item.index, '新' + PATTERN_NAME_ITEMS[2].cd + item.index, '新' + SELECTTYPE_NAME_ITEMS[0].cd + item.index];
                const subStaffCode = ['新' + PATTERN_NAME_ITEMS[3].cd + item.index, '新' + PATTERN_NAME_ITEMS[4].cd + item.index, '新' + SELECTTYPE_NAME_ITEMS[1].cd + item.index];
                const departmentCode = ['新' + PATTERN_NAME_ITEMS[7].cd + item.index, '新' + PATTERN_NAME_ITEMS[8].cd + item.index, '新' + SELECTTYPE_NAME_ITEMS[3].cd + item.index];
                const subDepartmentCode = ['新' + PATTERN_NAME_ITEMS[9].cd + item.index, '新' + PATTERN_NAME_ITEMS[10].cd + item.index, '新' + SELECTTYPE_NAME_ITEMS[4].cd + item.index];

                // 更新データ作成
                const updateList = STATE.listData.datas.filter((data) => data.datas[staffCode[0]] !== data.datas[backupStaff[0]] || data.datas[subStaffCode[0]] !== data.datas[backupSubStaff[0]]);

                const updateData = updateList.map((data) => {
                    return {
                        [CUSTOMERCHART_FIELD.id.writeCd]: data.datas[EXCEPT_ITEMS[0]], // レコードID
                        [CUSTOMERCHART_FIELD.revision.writeCd]: data.datas[EXCEPT_ITEMS[1]], // リビジョン
                        record: {
                            //[CUSTOMERCHART_FIELD.staff.cd]: { value: data.datas[staffCode[0]], lookup: true }, // 担当者コード
                            [CUSTOMERCHART_FIELD.staff.cd]: { value: data.datas[staffCode[1]], lookup: true }, // 担当者
                            [CUSTOMERCHART_FIELD.subStaff.cd]: { value: data.datas[subStaffCode[1]], lookup: true }, // 副担当者
                        },
                    };
                });

                // 更新データがない場合、メッセージを表示
                if (updateData.length === 0) {
                    Swal.fire({
                        title: '更新データなし',
                        text: '顧客カルテに適用する更新データがありません。',
                        icon: 'info',
                        confirmButtonText: '閉じる',
                    });
                    return;
                }

                // レコード更新
                let ref = null;
                try {
                    ref = await updateRecords(updateData, utils.constants.CUSTOMER_APP_ID);
                } catch (error) {
                    console.error('顧客カルテの適用に失敗しました。', error.error);
                    //error.error.headers['x-cybozu-error']
                    const headerCode = error.error?.headers?.['x-cybozu-error'];
                    if (headerCode === 'GAIA_BR01') {
                        Swal.fire({
                            title: '顧客カルテの適用失敗',
                            html: '<div>他のユーザが編集した可能性があります。<br>最新の内容を再表示後、再度適用を試みてください。</div>',
                            icon: 'warning',
                            confirmButtonText: '閉じる',
                        });
                    } else {
                        Swal.fire({
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
                    const save = await savePattern(item, updatedAt);
                } catch (error) {
                    console.error('パターン更新に失敗しました。', error.error);
                    //error.error.headers['x-cybozu-error']
                    const headerCode = error.error?.headers?.['x-cybozu-error'];
                    if (headerCode === 'GAIA_BR01') {
                        Swal.fire({
                            title: 'パターンの更新失敗',
                            html: '<div>他のユーザが編集した可能性があります。<br>最新の内容を再表示後、再度適用を試みてください。</div>',
                            icon: 'warning',
                            confirmButtonText: '閉じる',
                        });
                    } else {
                        Swal.fire({
                            title: 'パターンの更新失敗',
                            text: 'パターンの更新に失敗しました。',
                            icon: 'error',
                            confirmButtonText: '閉じる',
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
                                    [PATTERN_NAME_ITEMS[1].cd]: data.datas[staffCode[0]], // 担当者コード
                                    [PATTERN_NAME_ITEMS[2].cd]: data.datas[staffCode[1]], // 担当者
                                    [SELECTTYPE_NAME_ITEMS[0].cd]: data.datas[staffCode[2]], // 担当者コード名

                                    [PATTERN_NAME_ITEMS[7].cd]: data.datas[departmentCode[0]], // 担当者所属コード
                                    [PATTERN_NAME_ITEMS[8].cd]: data.datas[departmentCode[1]], // 担当者所属
                                    [SELECTTYPE_NAME_ITEMS[3].cd]: data.datas[departmentCode[2]], // 担当者所属コード名

                                    [PATTERN_NAME_ITEMS[3].cd]: data.datas[subStaffCode[0]], // 副担当者コード
                                    [PATTERN_NAME_ITEMS[4].cd]: data.datas[subStaffCode[1]], // 副担当者
                                    [SELECTTYPE_NAME_ITEMS[1].cd]: data.datas[subStaffCode[2]], // 副担当者コード名

                                    [PATTERN_NAME_ITEMS[9].cd]: data.datas[subDepartmentCode[0]], // 副担当者所属コード
                                    [PATTERN_NAME_ITEMS[10].cd]: data.datas[subDepartmentCode[1]], // 副担当者所属
                                    [SELECTTYPE_NAME_ITEMS[4].cd]: data.datas[subDepartmentCode[2]], // 副担当者所属コード名
                                },
                            };
                        } else {
                            return data;
                        }
                    });
                }, STATE.listData.datas);

                STATE.listData.datas = updatedArrays;

                // 担当者ごとに集計
                let totalData = [];
                // STATE.listData.datasにある担当者コードごとで決算月ごとにデータの数を集計
                STATE.listData.datas.forEach((item) => {
                    const staffCode = item.datas[PATTERN_NAME_ITEMS[1].cd]; // 担当者コード
                    const staffName = item.datas[PATTERN_NAME_ITEMS[2].cd]; // 担当者名
                    const fiscalMonth = parseInt(item.datas[CUSTOMERCHART_FIELD.fiscalMonth.cd]) || 0; // 決算月

                    // 既存の担当者データを検索
                    let matchData = totalData.find((data) => data.code === staffCode);

                    if (matchData) {
                        // 既存担当者の場合、該当月のカウントを増やす
                        let monthData = matchData.datas.find((d) => d.month === fiscalMonth);
                        if (monthData) {
                            monthData.count++;
                        } else {
                            matchData.datas.push({ month: fiscalMonth, count: 1 });
                        }
                    } else {
                        // 新規担当者の場合、新しいエントリを作成
                        totalData.push({
                            code: staffCode,
                            name: staffName,
                            datas: [{ month: fiscalMonth, count: 1 }],
                        });
                    }
                });
                STATE.listTotal = totalData;
            };

            /**
             * パターン保存
             * @param {object} item パターンオブジェクト
             * @param {string} updatedAt 更新日時
             */
            const savePattern = async (item, updatedAt) => {
                //const item.index;
                const staff = ['新' + PATTERN_NAME_ITEMS[1].cd + item.index, '新' + PATTERN_NAME_ITEMS[2].cd + item.index];
                const subStaff = ['新' + PATTERN_NAME_ITEMS[3].cd + item.index, '新' + PATTERN_NAME_ITEMS[4].cd + item.index];
                const department = ['新' + PATTERN_NAME_ITEMS[7].cd + item.index, '新' + PATTERN_NAME_ITEMS[8].cd + item.index];
                const subDepartment = ['新' + PATTERN_NAME_ITEMS[9].cd + item.index, '新' + PATTERN_NAME_ITEMS[10].cd + item.index];

                // バックアップ用
                const backupStaff = [
                    PATTERN_NAME_ITEMS[1].cd + '_OLD', // 担当者コード
                    PATTERN_NAME_ITEMS[2].cd + '_OLD', // 担当者名
                    PATTERN_NAME_ITEMS[7].cd + '_OLD', // 担当者所属コード
                    PATTERN_NAME_ITEMS[8].cd + '_OLD', // 担当者所属名
                ];
                const backupSubStaff = [
                    PATTERN_NAME_ITEMS[3].cd + '_OLD', // 副担当者コード
                    PATTERN_NAME_ITEMS[4].cd + '_OLD', // 副担当者名
                    PATTERN_NAME_ITEMS[9].cd + '_OLD', // 副担当者所属コード
                    PATTERN_NAME_ITEMS[10].cd + '_OLD', // 副担当者所属名
                ];

                // JSONに変換
                const filtered = STATE.listData.datas.map((item) => {
                    const result = {
                        [PATTERN_NAME_ITEMS[0].cd]: item.datas[PATTERN_NAME_ITEMS[0].cd], // $id

                        [PATTERN_NAME_ITEMS[1].cd]: item.datas[staff[0]], // 担当者
                        [PATTERN_NAME_ITEMS[2].cd]: item.datas[staff[1]],
                        [PATTERN_NAME_ITEMS[3].cd]: item.datas[subStaff[0]], // 副担当者
                        [PATTERN_NAME_ITEMS[4].cd]: item.datas[subStaff[1]],

                        [PATTERN_NAME_ITEMS[7].cd]: item.datas[department[0]], // 担当者所属
                        [PATTERN_NAME_ITEMS[8].cd]: item.datas[department[1]],
                        [PATTERN_NAME_ITEMS[9].cd]: item.datas[subDepartment[0]], // 副担当者所属
                        [PATTERN_NAME_ITEMS[10].cd]: item.datas[subDepartment[1]],
                    };

                    // バックアップ用フィールドを追加
                    // もともとバックアップ用フィールドがあればその値を、なければnullをセット（未設定は空欄にしたいため）
                    result[backupStaff[0]] = utils.common.containsKey(item.datas, backupStaff[0]) ? item.datas[backupStaff[0]] : null; // 担当者コード
                    result[backupStaff[1]] = utils.common.containsKey(item.datas, backupStaff[1]) ? item.datas[backupStaff[1]] : null; // 担当者名
                    result[backupStaff[2]] = utils.common.containsKey(item.datas, backupStaff[2]) ? item.datas[backupStaff[2]] : null; // 担当者所属コード
                    result[backupStaff[3]] = utils.common.containsKey(item.datas, backupStaff[3]) ? item.datas[backupStaff[3]] : null; // 担当者所属名
                    result[backupSubStaff[0]] = utils.common.containsKey(item.datas, backupSubStaff[0]) ? item.datas[backupSubStaff[0]] : null; // 副担当者コード
                    result[backupSubStaff[1]] = utils.common.containsKey(item.datas, backupSubStaff[1]) ? item.datas[backupSubStaff[1]] : null; // 副担当者名
                    result[backupSubStaff[2]] = utils.common.containsKey(item.datas, backupSubStaff[2]) ? item.datas[backupSubStaff[2]] : null; // 副担当者所属コード
                    result[backupSubStaff[3]] = utils.common.containsKey(item.datas, backupSubStaff[3]) ? item.datas[backupSubStaff[3]] : null; // 副担当者所属名
                    //result['更新日時'] = utils.common.containsKey(item.datas, '更新日時') ? item.datas['更新日時'] : null; // 更新日時

                    return result;
                });
                const json = JSON.stringify(filtered, null, 2);
                const id = item.id;
                const revision = item.revision;
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
                        return ref;
                    }
                } catch (error) {
                    console.error('パターン保存に失敗しました。', error.error);
                    //error.error.headers['x-cybozu-error']
                    const headerCode = error.error?.headers?.['x-cybozu-error'];
                    if (headerCode === 'GAIA_BR01') {
                        Swal.fire({
                            title: 'パターン保存失敗',
                            html: '<div>他のユーザが編集した可能性があります。<br>最新の内容を再表示後、再度適用を試みてください。</div>',
                            icon: 'warning',
                            confirmButtonText: '閉じる',
                        });
                    } else {
                        Swal.fire({
                            title: 'パターン保存失敗',
                            text: 'パターン保存に失敗しました。',
                            icon: 'error',
                            confirmButtonText: '閉じる',
                        });
                    }
                    return null;
                }
            };

            /**
             * 一括置換画面HTML作成
             * @param {string} staffs 担当者optionタグ
             * @param {string} staffsNew 変更後担当者optionタグ
             * @param {string} name パターン名
             * @return {string} html
             */
            const replaceAllHTML = (staffs, staffsNew, name) => {
                const html = `
                <div style="text-align: left;">
                    <p>変更する担当者区分を選択してください</p>
                        <span style="display:inline-block; border:1px solid #888; padding:4px 12px; margin-left:37px; margin-bottom:4px;">
                            <label style="margin:0;"><input type="checkbox" id="checkAll"> 全て選択</label>
                        </span><br>
                        <label style="margin-left:50px;"><input type="checkbox" id="staff" name="item" value="staff" checked> 担当者</label><br>
                        <label style="margin-left:50px;"><input type="checkbox" id="subStaff" name="item" value="subStaff"> 副担当者</label><br><br>
                    <p>変更する担当者を選択してください</p>

                    <p style="margin-left:20px; margin-bottom:4px;">変更元担当者</p>
                    <label style="margin-left:20px;"><input type="radio" name="staffRadio" value="pattern" checked> このパターンの担当者</label><br>
                    <label style="margin-left:20px;"><input type="radio" name="staffRadio" value="current"> 現在の顧客カルテの担当者</label><br><br>
                    <div style="margin-left:20px;" style="display: flex; align-items: center; gap: 8px;">
                        <select id="staffSelect">${staffsNew}</select>
                        <span>→</span>
                        <select id="afterStaffSelect">${staffsNew}</select>
                    </div>
                </div>
            `;
                return html;
            };

            /**
             * selectの設定
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
                options = options + `<option value="__EMPTY__">未設定</option>`;
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
                selectedStaff = selectedStaff === '__EMPTY__' ? '' : selectedStaff;

                // 置換元のデータがない場合、エラー
                let msgFlag = false;
                let msg = '';
                if (staffCheck) {
                    const datas = STATE.listData.datas.map((p) => p.datas[items.searchStaff[0]]);
                    const rc = datas.includes(selectedStaff);
                    if (!rc) {
                        msgFlag = true;
                        msg = '変更前担当者';
                        //Swal.showValidationMessage('変更前担当者のデータがありません。');
                        //return false;
                    }
                }
                if (subStaffCheck) {
                    const datas = STATE.listData.datas.map((p) => p.datas[items.searchStaff[1]]);
                    const rc = datas.includes(selectedStaff);
                    if (!rc) {
                        msgFlag = true;
                        msg = msg === '' ? '変更前副担当者' : msg + '、変更前副担当者';
                    }
                }
                if (msgFlag) {
                    Swal.showValidationMessage(msg + 'のデータがありません。');
                    return false;
                }

                return {
                    staff: selectedStaff,
                    afterStaff: afterStaffSelect,
                    staffs: items,
                    //radio: radio,
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

                    patternStaff[0] = '新' + PATTERN_NAME_ITEMS[1].cd + result.index; // 担当者コード
                    patternStaff[1] = '新' + PATTERN_NAME_ITEMS[2].cd + result.index; // 担当者名
                    patternStaff[2] = '新' + PATTERN_NAME_ITEMS[7].cd + result.index; // 担当者所属コード
                    patternStaff[3] = '新' + PATTERN_NAME_ITEMS[8].cd + result.index; // 担当者所属名
                    patternStaff[4] = '新' + SELECTTYPE_NAME_ITEMS[0].cd + result.index; // 担当者コード名
                    patternStaff[5] = '新' + SELECTTYPE_NAME_ITEMS[3].cd + result.index; // 担当者所属コード名

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

                    patternSubStaff[0] = '新' + PATTERN_NAME_ITEMS[3].cd + result.index; // 副担当者コード
                    patternSubStaff[1] = '新' + PATTERN_NAME_ITEMS[4].cd + result.index; // 副担当者名
                    patternSubStaff[2] = '新' + PATTERN_NAME_ITEMS[9].cd + result.index; // 副担当者所属コード
                    patternSubStaff[3] = '新' + PATTERN_NAME_ITEMS[10].cd + result.index; // 副担当者所属名
                    patternSubStaff[4] = '新' + SELECTTYPE_NAME_ITEMS[1].cd + result.index; // 副担当者コード名
                    patternSubStaff[5] = '新' + SELECTTYPE_NAME_ITEMS[4].cd + result.index; // 副担当者所属コード名

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
                const wk = '新' + SELECTTYPE_NAME_ITEMS[0].cd + item.index;
                const staffsCodePattern = getUniqueOptions(wk);
                const substaffsCode = getUniqueOptions(SELECTTYPE_NAME_ITEMS[1].cd); // 副担当者

                let optionStaffs = staffsCode.map((opt) => `<option value="${opt.value}" key="${opt.value}">${opt.label}</option>`).join('');
                optionStaffs = optionStaffs + `<option value="__EMPTY__">未設定</option>`;
                let optionStaffsPattern = staffsCodePattern.map((opt) => `<option value="${opt.value}" key="${opt.value}">${opt.label}</option>`).join('');
                optionStaffsPattern = optionStaffsPattern + `<option value="__EMPTY__">未設定</option>`;

                // 担当者一括置換画面HTML作成
                const html = replaceAllHTML(optionStaffs, optionStaffsPattern, item.name);

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
                            select.innerHTML = options;
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
                                select.innerHTML = options;
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
                            select.innerHTML = options;
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
                    width: '600px',
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

                STATE.listData.datas.forEach((item) => {
                    // 選択された担当者コードと同じ場合は置換
                    // 担当者
                    if (fields.staff.length > 0 && item.datas[fields.searchStaff[0]] === selectedStaffCode) {
                        // 変更後データをセット
                        item.datas[fields.patternStaff[0]] = afterStaffCode;

                        STATE.selectStaffs
                            .filter((s) => s[STAFFMASTER_FIELD.staffCode.cd] === afterStaffCode)
                            .forEach((s) => {
                                item.datas[fields.patternStaff[1]] = s[STAFFMASTER_FIELD.staff.name];
                                item.datas[fields.patternStaff[2]] = s[STAFFMASTER_FIELD.organization.cd] && s[STAFFMASTER_FIELD.organization.cd].length > 0 ? s[STAFFMASTER_FIELD.organization.cd][0].code : '';
                                item.datas[fields.patternStaff[3]] = s[STAFFMASTER_FIELD.organization.cd] && s[STAFFMASTER_FIELD.organization.cd].length > 0 ? s[STAFFMASTER_FIELD.organization.cd][0].name : '';
                            });
                        item.datas[fields.patternStaff[4]] = '[' + item.datas[fields.patternStaff[0]] + ']' + item.datas[fields.patternStaff[1]];
                        item.datas[fields.patternStaff[5]] = '[' + item.datas[fields.patternStaff[2]] + ']' + item.datas[fields.patternStaff[3]];
                        item.datas[fields.patternStaff[4] + '_vmodel'] = item.datas[fields.patternStaff[4]];
                    }
                    // 副担当者
                    if (fields.subStaff.length > 0 && item.datas[fields.searchStaff[1]] === selectedStaffCode) {
                        // 変更後データをセット
                        item.datas[fields.patternSubStaff[0]] = afterStaffCode;

                        STATE.selectStaffs
                            .filter((s) => s[STAFFMASTER_FIELD.staffCode.cd] === afterStaffCode)
                            .forEach((s) => {
                                item.datas[fields.patternSubStaff[1]] = s[STAFFMASTER_FIELD.staff.cd];
                                item.datas[fields.patternSubStaff[2]] = s[STAFFMASTER_FIELD.organization.cd] && s[STAFFMASTER_FIELD.organization.cd].length > 0 ? s[STAFFMASTER_FIELD.organization.cd][0].code : '';
                                item.datas[fields.patternSubStaff[3]] = s[STAFFMASTER_FIELD.organization.cd] && s[STAFFMASTER_FIELD.organization.cd].length > 0 ? s[STAFFMASTER_FIELD.organization.cd][0].name : '';
                            });
                        item.datas[fields.patternSubStaff[4]] = '[' + item.datas[fields.patternSubStaff[0]] + ']' + item.datas[fields.patternSubStaff[1]];
                        item.datas[fields.patternSubStaff[5]] = '[' + item.datas[fields.patternSubStaff[2]] + ']' + item.datas[fields.patternSubStaff[3]];
                        item.datas[fields.patternSubStaff[4] + '_vmodel'] = item.datas[fields.patternSubStaff[4]];
                    }
                });

                console.log('一括置換が完了しました');
            };

            /**
             * 担当者集計
             * @param {string} tableId テーブルID
             * @param {string} highlightClass ハイライトカラー
             */
            const totalCustomersPerStaff = async () => {
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
                    tableHtml += `<th colspan="2"style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">${STATE.patternNames.names[i].name}</th>`;
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
                    tableHtml += `<th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">合計</th>`;
                    tableHtml += `<th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">増減</th>`;
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
                        if (monthData.length > 0) {
                            tableHtml += `
                                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${monthData[0].count}</td>
                            `;
                        } else {
                            tableHtml += `
                                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">0</td>
                            `;
                        }
                    }
                    // 顧客数合計
                    const totalCount = staff.datas.reduce((sum, data) => sum + data.count, 0);
                    tableHtml += `<td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${totalCount}</td>`;

                    // パターンごと
                    let totalCountPat = 0;
                    for (let i = 0; i < STATE.patternNames.len; i++) {
                        const staffData = totalStaff.value[i].filter((s) => s.code === staff.code);
                        if (!staffData || staffData.length <= 0) {
                            tableHtml += `<td style="border: 1px solid #ddd; padding: 8px; text-align: right;">0</td>`;
                            tableHtml += `<td style="border: 1px solid #ddd; padding: 8px; text-align: right;">-${totalCount}</td>`;
                            continue;
                        }
                        // 合計
                        totalCountPat = staffData[0].datas.reduce((sum, data) => sum + data.count, 0);
                        tableHtml += `<td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${totalCountPat}</td>`;

                        // 増減
                        const diff = totalCountPat - totalCount;
                        tableHtml += `<td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${diff}</td>`;

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
                            tableHtml += `<td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${totalCountPat}</td>`;

                            // 増減（全員新規のため、増減は全てプラス）
                            tableHtml += `<td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${totalCountPat}</td>`;
                        } else {
                            // 該当パターンにデータがない場合
                            tableHtml += `<td style="border: 1px solid #ddd; padding: 8px; text-align: right;">0</td>`;
                            tableHtml += `<td style="border: 1px solid #ddd; padding: 8px; text-align: right;">0</td>`;
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

                /*tableHtml += `
                    <p>test:${totalStaff.value[0][0].name}</p>
                `;*/

                console.log(totalStaff);
                await Swal.fire({
                    title: '担当者別顧客数集計',
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
             * 一括置換担当者リスト取得
             * @param {string} tableId テーブルID
             * @param {string} highlightClass ハイライトカラー
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
             * 行クリックでハイライト設定
             * @param {string} tableId テーブルID
             * @param {string} highlightClass ハイライトカラー
             */
            const setupRowClickHighlighting = (tableId, highlightClass = HIGHTLIGHT_COLOR) => {
                const rows = document.querySelectorAll(`#${tableId} tbody tr`);
                rows.forEach((row) => {
                    // 全行にイベントリスナーを追加
                    row.addEventListener('click', () => {
                        // 既存のハイライトを削除
                        rows.forEach((r) => {
                            r.style.backgroundColor = '';
                        });
                        // クリックされた行にハイライトを追加
                        row.style.backgroundColor = highlightClass;

                        // クリックされた行のデータをSTATEに保存
                        const tbody = row.parentElement; // 親要素
                        const rowsInTbody = Array.from(tbody.querySelectorAll('tr'));
                        const relativeIndex = rowsInTbody.indexOf(row);

                        STATE.listDataPattern.clickNo = relativeIndex;
                        STATE.listDataPattern.clickName = row.textContent;

                        // クリックされた行のパターン名をSwalのinputにセット
                        Swal.getPopup().querySelector('#clickName').value = STATE.listDataPattern.clickName;
                        Swal.resetValidationMessage(); // バリデーションメッセージをリセット

                        //console.log('クリックされた行のインデックス:', STATE.listDataPattern.clickNo);
                    });
                });

                // ポップアップダイアログ画面の高さを調整
                const popup = Swal.getPopup();

                const item1 = document.querySelector('#swal2-title').getBoundingClientRect().height; // タイトル
                const item2 = document.querySelector('.swal2-actions').getBoundingClientRect().height; // ボタン
                const items = item1 + item2;

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
             * @param {string} code フィールドコード
             * @returns {array} 絞込用オプション配列
             */
            const getUniqueOptions = (code) => {
                //const values = (STATE.listData?.datas ?? []).map((item) => item.datas[code]).filter((v) => v !== undefined && v !== null && String(v).trim() !== '');
                //return [...new Set(values)];
                let cd = '';
                let nm = '';
                let staffFlg = [false, false]; // 担当者、副担当者フラグ
                let departmentFlg = [false, false]; // 担当者所属、副担当者所属フラグ

                // この箇所はメソッドにするかも
                const indexes = STATE.patternNames.names.map((item) => item.index);
                if (indexes.some((index) => code.includes(index))) {
                    // 新パターン名での絞込対応
                    const num = Number(code.match(/\d+/)); // 数値のみ取得
                    const str = code.replace(/\d+/g, ''); // 数値部分削除
                    if (str === '新' + SELECTTYPE_NAME_ITEMS[0].cd) {
                        cd = '新' + PATTERN_NAME_ITEMS[1].cd + num;
                        nm = '新' + PATTERN_NAME_ITEMS[2].label + num;
                        staffFlg[0] = true;
                    } else if (str === '新' + SELECTTYPE_NAME_ITEMS[1].cd) {
                        cd = '新' + PATTERN_NAME_ITEMS[3].cd + num;
                        nm = '新' + PATTERN_NAME_ITEMS[4].label + num;
                        staffFlg[1] = true;
                    } else if (str === '新' + SELECTTYPE_NAME_ITEMS[3].cd) {
                        cd = '新' + PATTERN_NAME_ITEMS[7].cd + num;
                        nm = '新' + PATTERN_NAME_ITEMS[8].label + num;
                        departmentFlg[0] = true;
                    } else if (str === '新' + SELECTTYPE_NAME_ITEMS[4].cd) {
                        cd = '新' + PATTERN_NAME_ITEMS[9].cd + num;
                        nm = '新' + PATTERN_NAME_ITEMS[10].label + num;
                        departmentFlg[1] = true;
                    }
                }

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

                let pairs = [];
                if (code === SELECTTYPE_NAME_ITEMS[0].cd || code === SELECTTYPE_NAME_ITEMS[1].cd || staffFlg.some((f) => f)) {
                    // 担当者選択のときはスタッフマスタから取得
                    // selectStaffsから表示用selectのデータ作成
                    // 施設・備品キーの値が配列データの「施設・備品」を除いたデータをfilteredStaffsに代入
                    let filteredStaffs = Array.isArray(STATE.selectStaffs) ? STATE.selectStaffs.filter((staff) => !(Array.isArray(staff['施設・備品']) && staff['施設・備品'].length > 0)) : [];
                    // 非表示フラグキーの値が配列データでないもののみを取得
                    filteredStaffs = Array.isArray(filteredStaffs) ? filteredStaffs.filter((staff) => !(Array.isArray(staff['非表示フラグ']) && staff['非表示フラグ'].length > 0)) : [];
                    // 退社日キーがnull, 空文字, undefinedの場合のみ抽出
                    filteredStaffs = Array.isArray(filteredStaffs) ? filteredStaffs.filter((staff) => staff['退社日'] === null || staff['退社日'] === '' || typeof staff['退社日'] === 'undefined') : [];

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
                    // 所属選択のときは部署マスタから取得
                    // 施設・備品キーの値が配列データの「施設・備品」を除いたデータをfilteredStaffsに代入
                    let filteredDepartments = Array.isArray(STATE.selectStaffs) ? STATE.selectStaffs.filter((staff) => !(Array.isArray(staff['施設・備品']) && staff['施設・備品'].length > 0)) : [];
                    // 非表示フラグキーの値が配列データでないもののみを取得
                    filteredDepartments = Array.isArray(filteredDepartments) ? filteredDepartments.filter((dept) => !(Array.isArray(dept['非表示フラグ']) && dept['非表示フラグ'].length > 0)) : [];
                    // 退社日キーがnull, 空文字, undefinedの場合のみ抽出
                    filteredDepartments = Array.isArray(filteredDepartments) ? filteredDepartments.filter((dept) => dept['退社日'] === null || dept['退社日'] === '' || typeof dept['退社日'] === 'undefined') : [];

                    // 組織選択キーの配列データからlabel/valueオブジェクト配列を作成
                    pairs = (filteredDepartments ?? [])
                        .filter((item) => Array.isArray(item[STAFFMASTER_FIELD.organization.cd]) && item[STAFFMASTER_FIELD.organization.cd].length > 0)
                        .flatMap((item) =>
                            item[STAFFMASTER_FIELD.organization.cd].map((org) => ({
                                label: '[' + org.code + ']' + org.name,
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
                                    label: '[' + departmentCode + ']' + departmentName,
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
             * @return {boolean} true:表示、false:非表示
             */
            const isVisibleLabel = (label) => {
                let rc = true;

                // 除外項目
                const patterns = PATTERN_NAME_ITEMS.filter((item) => item.cd !== '$id').map((cd) => cd.label);
                const exccempts = EXCEPT_ITEMS.concat(patterns, ORG_ITEM); // id revision 担当者コード　副担当者コード
                if (exccempts.includes(label)) {
                    rc = false;
                }
                //console.log('isVisibleLabel:', code, ' rc:', rc);
                return rc;
            };

            /**
             * ラベルから表示非表示判定
             * @param {string} label ラベル
             * @return {boolean} true:選択項目、false:テキスト項目
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

            /**
             * keyが新担当者コード名、新副担当者コード名のときは、trueをかえす
             * @param {string} key コード
             * @return {boolean} true:新担当者コード名 or 新副担当者コード名　false:それ以外
             */
            const isSelectData = (key) => {
                let rc = false;
                const indexes = STATE.patternNames.names.map((item) => item.index);
                //console.log('isSelectData key:', key, ' indexes:', indexes);
                if (indexes.some((index) => key.includes(index))) {
                    const num = Number(key.match(/\d+/)); // 数値のみ取得
                    const str = key.replace(/\d+/g, ''); // 数値部分削除
                    //console.log('some num:', num, ' str:', str);
                    if (str === '新' + SELECTTYPE_NAME_ITEMS[0].cd || str === '新' + SELECTTYPE_NAME_ITEMS[1].cd) {
                        rc = true;
                    }
                }
                return rc;
            };

            /**
             * selectのv-model用のkeyを返す
             * @param {string} key コード
             * @return {string} v-model用key
             */
            const setSelectVmodel = (key) => {
                let rc = '';
                rc = key + '_' + 'vmodel'; // v-model用
            };

            /**
             * パターンを追加したデータはすべてselectにする
             * @param {string} key コード
             * @return {}
             */
            const getSelectedStaff = (key) => {
                return [...new Set(STATE.listData.datas.map((item) => item.datas[key]))];
            };

            /**
             * 担当者選択変更時の処理
             * @param {number} index 行番号
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

                STATE.listData.datas[index].datas[key] = value;
                const num = Number(key.match(/\d+/)); // 数値のみ取得
                const str = key.replace(/\d+/g, ''); // 数値部分削除
                let cd = ''; // 担当者
                let nm = '';
                let orgCd = ''; // 担当者所属
                let orgNm = '';
                let org = ''; // 所属の[code]name用

                if (str === '新' + SELECTTYPE_NAME_ITEMS[0].cd) {
                    cd = '新' + PATTERN_NAME_ITEMS[1].cd + num;
                    nm = '新' + PATTERN_NAME_ITEMS[2].label + num;
                    orgCd = '新' + PATTERN_NAME_ITEMS[7].cd + num;
                    orgNm = '新' + PATTERN_NAME_ITEMS[8].label + num;
                    org = '新' + SELECTTYPE_NAME_ITEMS[3].cd + num;
                } else if (str === '新' + SELECTTYPE_NAME_ITEMS[1].cd) {
                    cd = '新' + PATTERN_NAME_ITEMS[3].cd + num;
                    nm = '新' + PATTERN_NAME_ITEMS[4].label + num;
                    orgCd = '新' + PATTERN_NAME_ITEMS[9].cd + num;
                    orgNm = '新' + PATTERN_NAME_ITEMS[10].label + num;
                    org = '新' + SELECTTYPE_NAME_ITEMS[4].cd + num;
                }
                STATE.listData.datas[index].datas[cd] = code;
                STATE.listData.datas[index].datas[nm] = name;

                // 担当者変更に伴って、所属も変更する
                if (code !== '') {
                    const staff = STATE.selectStaffs.find((staff) => staff[STAFFMASTER_FIELD.staffCode.cd] === code);
                    const orgs = staff[STAFFMASTER_FIELD.organization.cd];
                    STATE.listData.datas[index].datas[org] = '[' + orgs[0].code + ']' + orgs[0].name;
                    STATE.listData.datas[index].datas[orgCd] = orgs[0].code;
                    STATE.listData.datas[index].datas[orgNm] = orgs[0].name;
                } else {
                    // 空の場合は所属も空にする
                    STATE.listData.datas[index].datas[org] = '';
                    STATE.listData.datas[index].datas[orgCd] = '';
                    STATE.listData.datas[index].datas[orgNm] = '';
                }
                //console.log('changeStaff:', index, event, key, ' code:', code, ' name:', name, ' cd:', cd, ' nm:', nm);
            };

            /**
             * コードから背景色を設定（タイトル用）
             * @param {string} key コード
             * @return {string} 背景色
             */
            const setTitleBackColor = (key) => {
                const num = Number(key.match(/\d+/)); // 数値のみ取得
                const str = key.replace(/\d+/g, ''); // 数値部分削除
                const pattern = ['新' + SELECTTYPE_NAME_ITEMS[0].cd, '新' + SELECTTYPE_NAME_ITEMS[1].cd, '新' + SELECTTYPE_NAME_ITEMS[3].cd, '新' + SELECTTYPE_NAME_ITEMS[4].cd];

                let color = '';
                if (pattern.includes(str)) {
                    //const index = pattern.findIndex((p) => p === str);
                    color = PATTERN_TITLE_COLOR[num - 1];
                }
                return color;
            };
            /**
             * コードから背景色を設定（アイテム用）
             * @param {string} key コード
             * @return {string} 背景色
             */
            const setItemBackColor = (key, datas) => {
                const num = Number(key.match(/\d+/)); // 数値のみ取得
                const str = key.replace(/\d+/g, ''); // 数値部分削除
                const patterns = ['新' + SELECTTYPE_NAME_ITEMS[0].cd, '新' + SELECTTYPE_NAME_ITEMS[1].cd, '新' + SELECTTYPE_NAME_ITEMS[3].cd, '新' + SELECTTYPE_NAME_ITEMS[4].cd];
                const items = SELECTTYPE_NAME_ITEMS.filter((item) => item.cd !== SELECTTYPE_NAME_ITEMS[2].cd);

                // 背景色
                let color = '';
                if (patterns.includes(str)) {
                    color = PATTERN_ITEMS_COLOR[num - 1];
                }
                // 表示用とデータが違う場合、背景色を変更する
                const index = patterns.findIndex((p) => p === str);
                if (index !== -1 && color !== '') {
                    if (datas[items[index].cd] !== datas[key]) {
                        color = PATTERN_CHANGE_COLOR;
                    }
                }
                return color;
            };

            /**
             * コードから新たな項目名を作成
             * @param {string} key コード
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

            onMounted(async () => {
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
                    itemCount++;
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
                    let totalData = [];
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

                        // 決算月
                        items[i].datas[CUSTOMERCHART_FIELD.fiscalMonth.cd] = rec[CUSTOMERCHART_FIELD.fiscalMonth.cd]?.value ?? '';

                        // 担当者集計
                        const staffCode = items[i].datas[PATTERN_NAME_ITEMS[1].cd]; // 担当者コード
                        const staffName = items[i].datas[PATTERN_NAME_ITEMS[2].cd]; // 担当者名
                        const fiscalMonth = parseInt(items[i].datas[CUSTOMERCHART_FIELD.fiscalMonth.cd]) || 0; // 決算月

                        // 既存の担当者データを検索
                        let matchData = totalData.find((data) => data.code === staffCode);

                        if (matchData) {
                            // 既存担当者の場合、該当月のカウントを増やす
                            let monthData = matchData.datas.find((d) => d.month === fiscalMonth);
                            if (monthData) {
                                monthData.count++;
                            } else {
                                matchData.datas.push({ month: fiscalMonth, count: 1 });
                            }
                        } else {
                            // 新規担当者の場合、新しいエントリを作成
                            totalData.push({
                                code: staffCode,
                                name: staffName,
                                datas: [{ month: fiscalMonth, count: 1 }],
                            });
                        }

                        i++;
                    });
                    STATE.listData.datas = items;
                    STATE.itemLength = STATE.listData.items.length - itemCount - 2;
                    STATE.listTotal = totalData;

                    console.log('records:', records);
                } catch (e) {
                    console.log('項目取得失敗！:onMounted:', e.error);
                }

                // 担当者取得
                //console.log('wk:', wk);
                try {
                    const staffs = await getRecords('', '', '', utils.constants.STAFF_APP_ID);
                    if (staffs || staffs.length > 0) {
                        // 担当者　所属
                        // STAFFMASTER_FIELDに対応するデータを取得
                        const filtered = Object.fromEntries(Object.entries(STAFFMASTER_FIELD).filter(([key]) => key !== 'id' && key !== 'revision'));
                        STATE.selectStaffs = staffs.map((staffRec) => {
                            const obj = {};
                            Object.entries(filtered).forEach((key) => {
                                obj[key[1].cd] = staffRec[key[1].cd].value;
                            });
                            obj[STAFFMASTER_FIELD.id.readCd] = staffRec[STAFFMASTER_FIELD.id.readCd].value;
                            obj[STAFFMASTER_FIELD.revision.readCd] = staffRec[STAFFMASTER_FIELD.revision.readCd].value;
                            return obj;
                        });

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
                    });
                    STATE.listData.datas.push({
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
                console.log('STATE:', STATE);
                //totalStaff();
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
                getStaffList,
                setNewLabel,
                //makeNewItemName,
                isVisibleItem,
                //isVisibleLabel,
                isSelectType,
                isSelectData,
                //getSelectedStaff,
                //setSelectVmodel,
                changeStaff,
                savePattern,
                replaceAllPattern,
                applyCustomerChartPattern,
                //patternName,
                setTitleBackColor,
                setItemBackColor,
                totalCustomersPerStaff,
                totalStaff,
            };
        },
        template: /* HTML */ `
            <ul>
                <li>顧客一覧のテーブル（tableFieldsのフィールド）と担当者フィールド（staffFieldのフィールド）</li>
                <li>選択したパターンの担当者（staffFieldの分だけ用意）</li>
                <li>現在と表示中パターンの担当者の顧客数・所属組織の顧客数※複数組織に所属している場合は要検討</li>
                <li>適用した際は必ず適用日時と適用前のバックアップを取得・JSONに保存</li>
            </ul>
            <div id="bz_header">
                <button @click="addPattern" class="bz_bt_def">パターン追加</button>
                <button @click="openPattern" class="bz_bt_def">パターン開く</button>
                <button @click="totalCustomersPerStaff" class="bz_bt_def">担当者集計</button>
            </div>
            <div id="bz_events_main_container">
                <table class="bz_table_def">
                    <thead>
                        <pattern-set @savePattern="savePattern" @replaceAllPattern="replaceAllPattern" @applyCustomerChartPattern="applyCustomerChartPattern" :pattern="STATE.patternNames.names" :colspan="STATE.itemLength?STATE.itemLength:0" />

                        <tr>
                            <!--{{STATE.listData.items?STATE.listData.items.length:''}}:{{STATE.listData.items?STATE.patternNames.len:''}}-->
                            <template v-for="field in STATE.listData.items" :key="field">
                                <th v-if="isVisibleItem(field.code)" :style="{backgroundColor:setTitleBackColor(field.code)}">
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
                                    <td v-if="isVisibleItem(key.code)" :style="{backgroundColor:setItemBackColor(key.code,field.datas)}">
                                        <!--{{key.code + '_' + 'vmodel'}}:{{setNo(itemIndex,key.code)}}:{{key.code+'_'+index}}:{{index}}-->
                                        <!--test:{{isSelectData(key.code)}}:{{key.code}}-->
                                        <!--{{makeNewItemName(key.code)!==''?makeNewItemName(key.code).nm:''}}:-->
                                        <template v-if="isSelectData(key.code)">
                                            <select v-model="field.datas[key.code + '_' + 'vmodel']" @change="changeStaff(field.datas.$id,$event,key.code)">
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

            <div>
                <!--totalStaff: {{ totalStaff }}<br />-->
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
