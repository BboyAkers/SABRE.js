//@include [util]
//@include [global-constants]
//@include [color]
//@include [style]
//@include [style-override]
//@include [subtitle-event]
//@include [subtitle-parser]
/**
 * @fileoverview font server for the renderer.
 */
/**
 * An enum of platforms.
 * @private
 * @enum {number}
 */
const platforms = Object.freeze({
    UNICODE: 0,
    APPLE: 1,
    MICROSOFT: 3
});

/**
 * An enum of name types.
 * @private
 * @enum {number}
 */
const nameTypes = Object.freeze({
    COPYRIGHT: 0,
    FONT_FAMILY: 1,
    FONT_SUBFAMILY: 2,
    UNIQUE_ID: 3,
    FULL_NAME: 4,
    VERSION_STRING: 5,
    PS_NAME: 6,
    TRADEMARK: 7
});

const font_server_prototype = Object.create(Object, {
    _fonts: {
        /**
         * @type {?Array<Font>}
         */
        value: null,
        writable: true
    },

    _fontMapping: {
        /**
         * @type {?Object<string,Array<{font:Font,ascent:number,descent:number}>>}
         */
        value: null,
        writable: true
    },

    _wcharByteArrayToString: {
        /**
         * converts a wchar byte array to a string.
         * @param {Array<number>} arr
         * @return {string}
         */
        value: function _wcharByteArrayToString (arr) {
            let array = [];
            for (var i = 0; i < arr.length; i += 2) {
                array.push(parseInt((arr[i] << 8) | arr[i + 1], 10));
            }
            return String.fromCharCode.apply(null, array);
        },
        writable: false
    },

    init: {
        value: function init (config) {
            this._fonts = config.fontserver;
            this._fontMapping = {};
        },
        writable: false
    },

    _fixUnsignedToSignedShort: {
        value: function _fixUnsignedToSignedShort (num) {
            num = 0xffff & num;
            if (num > 0x7fff) num = -(0xffff & (~num + 1));
            return num;
        },
        writable: false
    },

    "getFontsAndInfo": {
        /**
         * @private
         * @param {string} name
         * @return {Array<{
         *              font:Font,
         *              ascent:number,
         *              descent:number,
         *              strikethroughSize:number,
         *              strikethroughPosition:number,
         *              underlineThickness:number,
         *              underlinePosition:number,
         *              weight:number,
         *              selection:number
         *          }>} the resulting font and info.
         */
        value: function getFontsAndInfo (name) {
            name = name.toLowerCase().trim();
            if (this._fontMapping[name]) return this._fontMapping[name];
            let results = [];
            for (let i = 0; i < this._fonts.length; i++) {
                let addFont = false;
                const nameTable = this._fonts[i].tables.name;
                const fontFamily =
                    nameTable?.windows?.fontFamily?.en ??
                    nameTable?.unicode?.fontFamily?.en ??
                    nameTable?.macintosh?.fontFamily?.en;
                const fontSubfamily = 
                    nameTable?.windows?.fontSubfamily?.en ??
                    nameTable?.unicode?.fontSubfamily?.en ??
                    nameTable?.macintosh?.fontSubfamily?.en;
                const preferredFamily = 
                    nameTable?.windows?.preferredFamily?.en ??
                    nameTable?.unicode?.preferredFamily?.en ??
                    nameTable?.macintosh?.preferredFamily?.en;
                const preferredSubfamily = 
                    nameTable?.windows?.preferredSubfamily?.en ??
                    nameTable?.unicode?.preferredSubfamily?.en ??
                    nameTable?.macintosh?.preferredSubfamily?.en;
                const fullName =
                    nameTable?.windows?.fullName?.en ??
                    nameTable?.unicode?.fullName?.en ??
                    nameTable?.macintosh?.fullName?.en;

                if (fontFamily) {
                    if (fontFamily.toLowerCase().trim() === name)
                        addFont = true;
                    else if (fontSubfamily){
                        if((fontFamily+" "+fontSubfamily).toLowerCase().trim() === name){
                            addFont = true;
                        }
                    }
                }
                if (preferredFamily) {
                    if (preferredFamily.toLowerCase().trim() === name)
                        addFont = true;
                    else if (preferredSubfamily){
                        if((preferredFamily+" "+preferredSubfamily).toLowerCase().trim() === name){
                            addFont = true;
                        }
                    }
                }
                if (fullName) {
                    if (fullName.toLowerCase().trim() === nameTypes)
                        addFont = true;
                }
                if (addFont) {
                    const font = this._fonts[i];
                    const ascent =
                        this._fixUnsignedToSignedShort(
                            font.tables.os2.usWinAscent
                        ) ||
                        font.tables.os2.sTypoAscent ||
                        font.tables.head.yMax;
                    const descent =
                        this._fixUnsignedToSignedShort(
                            font.tables.os2.usWinDescent
                        ) ||
                        -(
                            font.tables.os2.sTypoDescent ||
                            font.tables.head.yMin
                        );
                    results.push({
                        "font": font,
                        "ascent": ascent,
                        "descent": descent,
                        "strikethroughSize": font.tables.os2.yStrikeoutSize,
                        "strikethroughPosition": font.tables.os2.yStrikeoutPosition,
                        "underlineThickness": font.tables.post.underlineThickness,
                        "underlinePosition": font.tables.post.underlinePosition,
                        "weight": font.tables.os2.usWeightClass,
                        "selection": font.tables.os2.fsSelection
                    });
                }
            }
            this._fontMapping[name] = results;
            return results;
        }
    }
});
/**
 * Creates a FontServer
 * @private
 * @param {RendererData} config
 */
sabre["FontServer"] = function FontServer (config) {
    let server = Object.create(font_server_prototype);
    server.init(config);
    return server;
};
