// frida -p $(pidof com.mediatek.engineermode) -l wlash_bang.js

var libName = "libem_wifi_jni.so";
var hijackedEnv = null;
var hijackedClass = null;
var startTxName = "_ZL53com_mediatek_engineermode_wifi_EMWifi_HQA_DBDCStartTXP7_JNIEnvP8_jobjectiiiiiiiiiiii";
var stopTxName = "_ZL52com_mediatek_engineermode_wifi_EMWifi_HQA_DBDCStopTXP7_JNIEnvP8_jobjecti";

var interval = setInterval(function() {
    var module = Process.findModuleByName(libName);
    if (module) {
        clearInterval(interval);
        var symbols = module.enumerateSymbols();
        var funcs = {};
        
        for(var i=0; i<symbols.length; i++) {
            if(symbols[i].name.indexOf("getFwManifestVersion") !== -1 && symbols[i].name.indexOf("JNIEnv") !== -1) {
                funcs["trigger"] = symbols[i].address;
            }
            if(symbols[i].name === startTxName) funcs["start"] = symbols[i].address;
            if(symbols[i].name === stopTxName) funcs["stop"] = symbols[i].address;
            if(symbols[i].name.indexOf("SetTxPower") !== -1 && symbols[i].name.indexOf("JNIEnv") !== -1) {
                funcs["pwr"] = symbols[i].address;
            }
        }

        if (funcs["trigger"] && funcs["start"] && funcs["stop"]) {
            console.log("[*] LOADED. Open WiFi settings to FIRE.");
            Interceptor.attach(funcs["trigger"], {
                onEnter: function(args) {
                    if (!hijackedEnv) {
                        hijackedEnv = args[0];
                        hijackedClass = args[1];
                        console.log("[!] EXECUTING FLASH STRIKE...");
                        runStrike(funcs);
                    }
                }
            });
        }
    }
}, 500);

function runStrike(funcs) {
    var startTx = new NativeFunction(funcs["start"], 'int', ['pointer', 'pointer', 'int', 'int', 'int', 'int', 'int', 'int', 'int', 'int', 'int', 'int', 'int', 'int']);
    var stopTx = new NativeFunction(funcs["stop"], 'int', ['pointer', 'pointer', 'int']);
    var setPwr = funcs["pwr"] ? new NativeFunction(funcs["pwr"], 'int', ['pointer', 'pointer', 'int', 'int', 'int', 'int', 'int']) : null;

    try {
        if (setPwr) {
            setPwr(hijackedEnv, hijackedClass, 0, 0, 20, 0, 0); 
        }

        var res = startTx(hijackedEnv, hijackedClass, 0, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        
        if(res == 0) {
            Thread.sleep(1.0);
        } else {
            console.log("[-] Driver rejected.");
        }

    } catch(e) {
        console.log(e);
    } finally {
        stopTx(hijackedEnv, hijackedClass, 0);
        console.log("[+] FINISHED.");
    }
}
