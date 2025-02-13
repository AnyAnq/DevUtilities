"use strict";
//FYI: https://github.com/Tencent/puerts/blob/master/doc/unity/manual.md
Object.defineProperty(exports, "__esModule", { value: true });
exports.onDestroy = exports.onPublish = void 0;
const csharp_1 = require("csharp");
const App = csharp_1.FairyEditor.App;
/**
 * 自定义代码导出
 */
class TypeCodeWriter {
    constructor(config) {
        config = config || {};
        this.blockStart = config.blockStart || "{";
        this.blockEnd = config.blockEnd || "}";
        this.blockFromNewLine = config.blockFromNewLine;
        if (this.blockFromNewLine == null || this.blockFromNewLine == undefined) {
            this.blockFromNewLine = false;
        }
        if (config.usingTabs) {
            this.indentStr = "\t";
        }
        else {
            this.indentStr = '    ';
        }
        this.usingTabs = config.usingTabs;
        this.endOfLine = config.endOfLine || '\n';
        this.lines = [];
        this.indent = 0;
        this.writeMark();
    }
    writeImports(imports) {
        if (this.lines.length > 0 && imports.length > 0) {
            //插入一个空行
            this.lines.splice(1, 0, "");
            //插入导入
            this.lines.splice(2, 0, ...imports);
        }
    }
    writeMark() {
        this.lines.push("/** This is an automatically generated class by FairyGUI. Please do not modify it. **/");
        this.lines.push("");
    }
    writeln(fmt, ...args) {
        if (!fmt) {
            this.lines.push("");
            return this;
        }
        let str = '';
        for (let i = 0; i < this.indent; i++) {
            str += this.indentStr;
        }
        //TODO
        // str += string.format(format, ...)
        str += fmt;
        this.lines.push(str);
        return this;
    }
    startBlock() {
        if (this.blockFromNewLine) {
            this.writeln(this.blockStart);
        }
        else {
            let str = this.lines[this.lines.length - 1];
            this.lines[this.lines.length - 1] = str + ' ' + this.blockStart;
        }
        this.indent = this.indent + 1;
        return this;
    }
    endBlock() {
        this.indent = this.indent - 1;
        this.writeln(this.blockEnd);
        return this;
    }
    incIndent() {
        this.indent = this.indent + 1;
        return this;
    }
    decIndent() {
        this.indent = this.indent - 1;
        return this;
    }
    reset() {
        if (this.lines.length > 0) {
            this.lines = [];
        }
        this.indent = 0;
        this.writeMark();
    }
    toString() {
        let str = "";
        for (let i = 0; i < this.lines.length; i++) {
            if (i + 1 == this.lines.length) {
                str += this.lines[i];
            }
            else {
                str += this.lines[i] + this.endOfLine;
            }
        }
        return str;
    }
    save(filePath) {
        let str = this.toString();
        csharp_1.System.IO.File.WriteAllText(filePath, str);
    }
}
//常量
const KEY_PUBLISH = "Publish";
//fgui内置名称
const BUILT_IN_NAME = ["title", "icon", "bar", "bar_v", "grip", "arrow1", "arrow2", "ani", "list", "closeButton", "dragArea", "contentArea"];
const CONTROL_IN_NAME = ["button", "grayed", "checked", "expanded", "leaf"];
//fgui内置类型
const BUILT_IN_TYPE = ["GComponent", "GButton", "GComboBox", "GGraph", "GGroup", "GImage", "GLabel", "GList", "GObjectPool", "GLoader", "GLoader3D", "GMovieClip", "GProgressBar", "GRichTextField", "GRoot", "GScrollBar", "GSlider", "GTextInput", "GTree", "GTreeNode", "GTextField", "Controller", "Transition"];
//全局发布设置
var Config;
(function (Config) {
})(Config || (Config = {}));
function onPublish(handler) {
    //该包是否发布代码
    if (!(handler.genCode)) {
        return;
    }
    Config.globalPublishSettings = App.project.GetSettings(KEY_PUBLISH);
    if (Config.globalPublishSettings.codeGeneration.allowGenCode) {
        console.log("开始生成代码...");
        genCode(handler);
        console.log("生成代码完成!");
    }
}
exports.onPublish = onPublish;
function onDestroy() {
    console.log("退出插件!");
}
exports.onDestroy = onDestroy;
console.log('CodePublish');
/**
 * 生成代码
 * @param handler
 */
function genCode(handler) {
    //屏蔽默认导出
    handler.genCode = false;
    //报名
    const pkgName = handler.pkg.name;
    //导出路径
    const exportCodePath = handler.exportCodePath + "/" + pkgName;
    //获取需要导出的
    const codeGeneration = Config.globalPublishSettings.codeGeneration;
    const classes = handler.CollectClasses(codeGeneration.ignoreNoname, codeGeneration.ignoreNoname, "");
    //检查目标文件夹是否存在,并且删除旧的文件
    handler.SetupCodeFolder(exportCodePath, "cs");
    //类名前缀
    const classNamePrefix = codeGeneration.classNamePrefix;
    //成员名前缀
    const memberNamePrefix = codeGeneration.memberNamePrefix;
    //导入的类
    const imports = [];
    let importMap = {};
    //成员变量初始化
    const memberInit = [];
    let codePkgName = handler.ToFilename(handler.pkg.name);
    let namespaceName = codePkgName;
    let isMonoGame = handler.project.type == csharp_1.FairyEditor.ProjectType.MonoGame;

    console.log(handler.pkg.name, classes.Count);
    //遍历生成
    let writer = new TypeCodeWriter({ usingTabs: true });
    for (let i = 0; i < classes.Count; i++) {
        writer.reset();
        imports.length = 0;
        importMap = {};
        memberInit.length = 0;
        const classInfo = classes.get_Item(i);
        const members = classInfo.members;

        // 固定命名空间
        imports.push(`using FairyGUI;`)
        imports.push(`using FairyGUI.Utils;`)
    
        // 直接写入
        writer.writeln('namespace ' + namespaceName);
        writer.startBlock();
        if (classInfo.superClassName != "GComponent"){
            writer.writeln(`public partial class ${classInfo.className} : ${classInfo.superClassName}`);
        }
        else{
            imports.push(`using HotUpdate.Base;`)
            writer.writeln(`public partial class ${classInfo.className} : FUIBase`);
        }
        
        writer.startBlock();

        //类成员
        for (let k = 0; k < members.Count; k++) {
            const member = members.get_Item(k);
            let type = member.type;
            let typePath = "";
            //当前成员组件不在同一个包,导出类型判断
            if (member.res && handler.pkg.name != member.res.owner.name) {
                if (isMemberNeedGenCode(handler, member.res)) {
                    const name = member.res.fileName.replace(".xml", "");
                    type = `${classNamePrefix}${name}`;
                    typePath = `../${member.res.owner.name}/${type}`;
                    imports.push(`using ${member.res.owner.name};`);
                }
            }
            let isInType = true;
            if (BUILT_IN_TYPE.indexOf(type) >= 0) {
                //拼接命名空间
                // type = "fgui." + type;
            }
            else {
                isInType = false;
                if (typePath == "") {
                    typePath = `./${type}`;
                }
                //类型导入
                if (!importMap[type]) {
                    importMap[type] = true;
                }
            }
            writer.writeln(`public ${type} ${member.varName};`);

            //变量成员初始化
            if (Config.globalPublishSettings.codeGeneration.getMemberByName) {
                if (isInType && member.type == "Controller") {
                    memberInit.push(`this.${member.varName} = this.GetController(${member.name});`);
                }
                else if (isInType && member.type == "Transition") {
                    memberInit.push(`this.${member.varName} = this.GetTransition(${member.name});`);
                }
                else {
                    memberInit.push(`this.${member.varName} = (${type})(this.GetChild(${member.name}));`);
                }
            }
            else {
                if (isInType && member.type == "Controller") {
                    memberInit.push(`this.${member.varName} = this.GetControllerAt(${member.index});`);
                }
                else if (isInType && member.type == "Transition") {
                    memberInit.push(`this.${member.varName} = this.GetTransitionAt(${member.index});`);
                }
                else {
                    memberInit.push(`this.${member.varName} = (${type})(this.GetChildAt(${member.index}));`);
                }
            }
        }
        //静态成员URL
        writer.writeln(`public const string URL = "${classInfo.res.GetURL()}";`);
        writer.writeln(`public const string PkgName = "${handler.pkg.name}";`);
        writer.writeln(`public const string ResName = "${classInfo.resName}";`);
        writer.writeln("");
        //创建函数
        writer.writeln(`public static ${classInfo.className} CreateInstance()`);
        writer.startBlock();
        writer.writeln(`return (${classInfo.className})UIPackage.CreateObject("${classInfo.res.owner.name}", "${classInfo.resName}");`);
        writer.endBlock();
        writer.writeln("");
        //构造函数
        if (isMonoGame) {
            writer.writeln("protected override void OnConstruct()");
            writer.startBlock();
        }
        else {
            writer.writeln('public override void ConstructFromXML(XML xml)');
            writer.startBlock();
            writer.writeln('base.ConstructFromXML(xml);');
            writer.writeln();
        }
        for (let i = 0; i < memberInit.length; i++) {
            writer.writeln(memberInit[i]);
        }
        writer.endBlock();
        writer.endBlock();
        writer.endBlock();
        //插入导入类
        writer.writeImports(imports);
        writer.save(`${exportCodePath}/${classInfo.className}.cs`);
    }
    //写出Binder
    writer.reset();
    let binderName = codePkgName + 'Binder';
    writer.writeln('using FairyGUI;');
    writer.writeln();
    writer.writeln('namespace ' + namespaceName);
    writer.startBlock();
    writer.writeln('public class ' + binderName);
    writer.startBlock();
    writer.writeln('public static void BindAll()');
    writer.startBlock();
    for (let i = 0; i < classes.Count; i++) {
        let classInfo = classes.get_Item(i);
        writer.writeln('UIObjectFactory.SetPackageItemExtension('+ classInfo.className +'.URL, typeof(' + classInfo.className + '));');
    }
    writer.endBlock(); //bindall
    writer.endBlock(); //class
    writer.endBlock(); //namespace
    writer.save(exportCodePath + '/' + binderName + '.cs');
}
/**
 * 判断指定item是否导出了代码
 * @param handler
 * @param item
 */
function isMemberNeedGenCode(handler, item) {
    //不生成使用默认名称的成员
    if (Config.globalPublishSettings.codeGeneration.ignoreNoname) {
        let asset = item.GetAsset();
        if (asset instanceof csharp_1.FairyEditor.ComponentAsset) {
            //遍历成员校验命名
            const list = asset.displayList;
            let hasCustomize = false;
            for (let i = 0; i < list.Count; i++) {
                const element = list.get_Item(i);
                //控件名
                const name = element.desc.GetAttribute("name");
                //是否是内置名字
                if (BUILT_IN_NAME.indexOf(name) >= 0) {
                    continue;
                }
                //n
                if (name.startsWith("n")) {
                    const num = Number(name.replace("n", ""));
                    if (Number.isNaN(num) == false) {
                        continue;
                    }
                }
                hasCustomize = true;
                break;
            }
            if (!hasCustomize) {
                //自定义控制器判断
                const elements = asset.xml.elements;
                for (let k = 0; k < elements.Count; k++) {
                    const element = elements.get_Item(k);
                    if (element.name != "controller") {
                        continue;
                    }
                    const name = element.GetAttribute("name");
                    if (CONTROL_IN_NAME.indexOf(name) < 0) {
                        hasCustomize = true;
                        break;
                    }
                }
            }
            if (hasCustomize) {
                return true;
            }
        }
    }
    return false;
}
