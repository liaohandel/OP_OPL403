console.log("[opf403 ] start regcmd_gx8 20180701x1 ...");

var router    = require('express').Router();

var Client = require('node-rest-client').Client;
var client = new Client();
var cargs = {
    requestConfig: {
        timeout: 500,
        noDelay: true,
        keepAlive: true
    },
    responseConfig: {
        timeout: 1000 //response timeout 
    }
};

var pdbuffer  = require('./pdbuffer_v02.js');
var autocmd = require('./autocmd_gx8.js');
var cmdcode = require("./handelrs485x2");

//=== syspub function ===
function jobjcopy(jobj){
	return JSON.parse(JSON.stringify(jobj));	
}

function apipamcheck(res,cmd,uuid,pos,group,cstu,callback){
	console.log("API cmd ="+cmd+" uuid="+uuid+" pos="+pos+" group="+group);
	//if(typeof(group) == "undefined" )console.log("group Fail ...");
	if( (uuid != pdbuffer.setuuid) || (typeof(cmd) == "undefined") || (typeof(pos) == "undefined") || (typeof(group) == "undefined") || (typeof(cstu) == "undefined") ){
		let jobj = { "success" : "false" };  
		console.log(JSON.stringify(jobj));
		res.json(jobj);
		return;
	}
	let jobj = {  "success" : "true"  }; 
	console.log(JSON.stringify(jobj));
	res.json(jobj);
	
	callback();
}

function vcmdapipamcheck(res,cmd,uuid,pos,group,cstu,callback){
	console.log("API cmd ="+cmd+" uuid="+uuid+" pos="+pos+" group="+group);
	//if(typeof(group) == "undefined" )console.log("group Fail ...");
	if( (uuid != pdbuffer.setuuid) || (typeof(cmd) == "undefined") || (typeof(pos) == "undefined") || (typeof(group) == "undefined") || (typeof(cstu) == "undefined") ){
		let jobj = { "success" : "false" };  
		console.log(JSON.stringify(jobj));
		res.json(jobj);
		return;
	}
	//let jobj = {  "success" : "true"  }; 
	//console.log(JSON.stringify(jobj));
	//res.json(jobj); //viture api command msut res data to web server!!!
	
	callback();
}


//=== keyPad function call ===
const KPADLIB = ["KEYPAD0","KEYPAD1","KEYPAD2"];

function keylistapicall(kapilist){
	let chkcmd =""
	if(kapilist.length > 0 ){
		for(kk in kapilist ){
			//console.log("CMD="+kapilist[kk].CMD +"POS="+kapilist[kk].POS +"Action="+kapilist[kk].Action +"STU="+kapilist[kk].STU +"GROUP="+kapilist[kk].GROUP);
			chkcmd = kapilist[kk].CMD;
			//keypadlisturl = "http://127.0.0.1:3000/"+kapilist[kk].CMD+"?UUID="+pdbuffer.setuuid+"&Action="+kapilist[kk].Action+"&POS="+kapilist[kk].POS+"&STU="+kapilist[kk].STU+"&GROUP="+kapilist[kk].GROUP
			keypadlisturl = "http://127.0.0.1:3000/"+chkcmd+"?UUID="+pdbuffer.setuuid+"&Action="+kapilist[kk].Action+"&POS="+kapilist[kk].POS+"&STU="+kapilist[kk].STU+"&GROUP="+kapilist[kk].GROUP
			client.get(keypadlisturl, function (data, response) {
				console.log("get ok...");
			}).on("error", function(err) {console.log("err for client");});
	
			//ext = http://tscloud.opcom.com/Cloud/API/v2/KeypadUpdate?ID=OFA1C0044826BEF87AEA0481&KeypadID=KEYPAD0&Index=K004&value=ON			
			if(chkcmd == "REGCMD/KEYSETUP"){
				
				updatekeysstuatusurl= pdbuffer.pdjobj.PDDATA.v2keypadstatusupdateurl+"?ID="+pdbuffer.setuuid+"&KeypadID="+kapilist[kk].POS+"&Index="+kapilist[kk].GROUP+"&value="+kapilist[kk].STU;
				console.log("sudo active update to webui =>"+updatekeysstuatusurl);
				client.get(updatekeysstuatusurl,cargs, function (data, response) {
					console.log("keypad active update to webui   ok ...");
				}).on("error", function(err) {console.log("err for client");}).on('requestTimeout', function (req) {req.abort();});
				
				updatekeysstuatusurl220 = "http://192.168.5.220/API/v2/KeypadUpdate.php"+"?ID="+pdbuffer.setuuid+"&KeypadID="+kapilist[kk].POS+"&Index="+kapilist[kk].GROUP+"&value="+kapilist[kk].STU;
				console.log("sudo active update to webui =>"+updatekeysstuatusurl220);
				client.get(updatekeysstuatusurl220,cargs, function (data, response) {
					console.log("keypad active update to webui   ok ...");
				}).on("error", function(err) {console.log("err for client");}).on('requestTimeout', function (req) {req.abort();});
				
			};
		}
	}
}

function keypadjload(keyscan){
	let keypadno = Number('0x'+keyscan.substr(0,2));
	if(keypadno < KPADLIB.length ){	
		let keypadname = KPADLIB[keypadno];
		
		let skeyinx = 	keyscan.substr(2,2);	
		let skeystu = 	keyscan.substr(4,2);	
		//===
		if(!(keypadname in pdbuffer.jkeypd.KEYLIB)){
			console.log(">>JSON KEYLIB not define "+keypadname);
			return
		}
			
		let stpt = Number("0x"+skeystu);
		let jketbuff={};
		let jkeypush ={};
		let keycmask ="ON";
		ksop = "K0"+skeyinx
		console.log("key="+ksop)
		if(ksop in pdbuffer.jkeypd.KEYLIB[keypadname]){
			jketbuff = pdbuffer.jkeypd.KEYLIB[keypadname][ksop];
			if(stpt < jketbuff.STATUS.stcnt){
				keycmask = jketbuff.STATUS.stmask[stpt];
				jkeypush = jketbuff.EVENT[keycmask];
				keylistapicall(jkeypush)
				// for(jkk in jkeypush ){
					// console.log("keyapi>>"+jkeypush[jkk]);
				// }
				
				console.log("key="+ksop+"no define in keypad1="+stpt)
			}else{
				console.log("keystu="+stpt+"no define in "+ksop);
			}
		}else{
			console.log("key="+ksop+"no define in keypad1="+stpt)
		}
	}
}

function regcmdchkloop(){
		//### fa auto check keypad push event ###
		setInterval(function(){			
			//console.log("0xfc command check 0..."+global.arxokflag)
			if(pdbuffer.keypadpushbuffer.length > 0){
				let kpadrun = pdbuffer.keypadpushbuffer.shift();
				console.log("psuh keypad = "+kpadrun);
				keypadjload(kpadrun);
			}
		},500);

}


//localhost:3000/api/telephone
router.get('/',function(req,res,next){
	//console.log(req.body)
	console.log(req.query.pin);
	res.send('Wellcom REGCMD API !')
});

router.get('/check',function(req,res,next){
	//console.log(req.body)
	console.log(req.query.pin);
	res.send('Hello regcmd check !')
});
  
//system ATUO JSON formt data load and set to buffer 
const webuiautokey = {
	"GROWLED":0,"CYCLEFAN":0,"SPRAY":0,"REFRESH":0,"UV":0,"PUMP":0,"GROWUPDOWN":0,
	"AIRCON":0,"AIRRH":0,"WATERTM":0,"CO2":0,"OPWAVE":0,"DOSE":0
}

//=====================================================
// auto function active api command 
//=====================================================
router.get('/AUTOSETUP',function(req,res,next){	//ok	
	console.log(req.query);	
	let cmd = req.query.Action
	let uuid = req.query.UUID
	let pos = req.query.POS
	let group = Number(req.query.GROUP)
	let cstu = req.query.STU
	
	//console.log("API cmd ="+cmd+" uuid="+uuid+" pos="+pos+" group="+group);
	vcmdapipamcheck(res,cmd,uuid,pos,group,cstu,()=>{
		let cmdindex=0;
		let jobj = { "success" : "false" };  
		
		if(cmd in pdbuffer.pdjobj.subcmd)cmdindex = pdbuffer.pdjobj.subcmd[cmd]
			
		if((pos in pdbuffer.jautocmd.DEVLIST) || (pos in pdbuffer.jautocmd.WATERLOOP) ){ //check pos is working 
			if(cmdindex <= 1){
				console.log("OFF/ON Command only by pos = 0000");
				res.json(jobj);
				//console.log(">>autox11");
				return;// OFF /ON must POS="0000"
			}
		}else{			
			if(pos != "0000"){  // OFF /ON must POS="0000"
				if(cmd != "SET"){//if pos no define must SET command  					
					console.log(" SET Command only by new pos = "+pos);
					res.json(jobj);
				//console.log(">>autox12");
					return;//if new POS must use SET
				}
			}else {
				if(cmdindex > 1){//ON=1/OFF=0 by 0000
					if(cmdindex != 3 && cmdindex!=4){//AUTO==3 by 0000 or SET==4 by 0000
						console.log(" AUTO/SET Command only by pos = 0000");
						res.json(jobj);
						//console.log(">>autox13");
						return;// OFF/ON must POS="0000"
					}
				}
			}
		}

		jobj = {  "success" : "true"  }; 
		switch(cmd){//sch subcmd //"f5 20 08 00 02 14 12 34 12 34 13" 14920000A0
			case "OFF"://reload all auto JSON to buffer
				res.json(jobj);
				if(pos == "0000")pdbuffer.jautocmd_load(()=>{
					console.log("JAUTO reload ok !");
					autocmd.reload_autojob();//relaod auto json to buffer 
				});//reload files to buffer
				break
			case "ON"://save buffer to JSON files 
				res.json(jobj);
				if(pos == "0000")pdbuffer.jautocmd_update(()=>{
					console.log("JAUTO Save ok !");
				});//update buffer to Files
				break
			case "LOAD":
				if(cstu == "02"){					
					jobj = pdbuffer.jautocmd.WATERLOOP[pos];
				}else{	
					jobj = pdbuffer.jautocmd.DEVLIST[pos];
				}
				res.json(jobj);	
				break
			case "AUTO":
				res.json(jobj);
				//console.log(">>autox31");
				if(pos == "0000"){
					if(cstu == "00"){//all web ui auto Stop 	
						for(kk in pdbuffer.jautocmd.DEVLIST){
							if(kk in webuiautokey){
								pdbuffer.jautocmd.DEVLIST[kk].STATU=0;
								if(kk in autocmd.sch_autojob)autocmd.sch_autojob[kk].STATU=0;
							}
						}
					}
					if(cstu == "01"){//all web ui auto Start run	
						for(kk in pdbuffer.jautocmd.DEVLIST){
							if(kk in webuiautokey){
								pdbuffer.jautocmd.DEVLIST[kk].STATU=1;
								if(kk in autocmd.sch_autojob)autocmd.sch_autojob[kk].STATU=1;
							}
						}
					}					
				}else{
					if(cstu == "00"){//DEVLIST AUTO OFF
						pdbuffer.jautocmd.DEVLIST[pos].STATU=0;
						if(pos in autocmd.sch_autojob)autocmd.sch_autojob[pos].STATU=0;
					}
					if(cstu == "01"){//DEVLIST AUTO ON
						pdbuffer.jautocmd.DEVLIST[pos].STATU=1;
						if(pos in autocmd.sch_autojob)autocmd.sch_autojob[pos].STATU=1;
					}
					if(cstu == "02"){//WATERLOOP mode5 OFF
						pdbuffer.jautocmd.WATERLOOP[pos].SENSOR_CONTROL=0;
						pdbuffer.jautocmd.WATERLOOP[pos].STATU=0;	
						if(pos == "autotmloop"){
							tmlab="TEMPERATURE!LOOP";
							setrangss = pdbuffer.jautocmd.DEVLIST.AIRCON.RUNLOOP[tmlab];
							settmlow = setrangss.substr(0,4);
							settmhi = setrangss.substr(4,4);
							//console.log("loadx1 low , hi ="+settmlow+" "+settmhi);
							pdbuffer.jautocmd.WATERLOOP.autotmloop.CHKLOOP.CHKVALUE.INTM_LOW = Number(settmhi);
							
							pdbuffer.jautocmd.WATERLOOP.autotmloop.CHKLOOP.CHKVALUE.INTM_LEVLIST[2]= Number(settmhi);
							pdbuffer.jautocmd.WATERLOOP.autotmloop.CHKLOOP.CHKVALUE.INTM_LEVLISTUP[2]= Number(settmhi)+20;
							pdbuffer.jautocmd.WATERLOOP.autotmloop.CHKLOOP.CHKVALUE.INTM_LEVLISTDOWN[2]= Number(settmhi)-20;
							
							pdbuffer.jautocmd.WATERLOOP.autotmloop.CHKLOOP.CHKVALUE.INTM_LEVLIST[1]= Number(settmlow);
							pdbuffer.jautocmd.WATERLOOP.autotmloop.CHKLOOP.CHKVALUE.INTM_LEVLISTUP[1]= Number(settmlow)+20;
							pdbuffer.jautocmd.WATERLOOP.autotmloop.CHKLOOP.CHKVALUE.INTM_LEVLISTDOWN[1]= Number(settmlow)-20;
							
							pdbuffer.jautocmd.WATERLOOP.autotmloop.CHKLOOP.CHKVALUE.OUTTM_LOW = Number(settmhi);
							pdbuffer.jautocmd.WATERLOOP.autotmloop.CHKLOOP.CHKVALUE.OUTTM_LEVLIST[2]= Number(settmhi);
							pdbuffer.jautocmd.WATERLOOP.autotmloop.CHKLOOP.CHKVALUE.OUTTM_LEVLIST[1]= Number(settmlow);
							
						}
					}
					if(cstu == "03"){//WATERLOOP mode5 ON
						pdbuffer.jautocmd.WATERLOOP[pos].SENSOR_CONTROL=0;
						pdbuffer.jautocmd.WATERLOOP[pos].STATU=1;	
						if(pos == "autotmloop"){
							tmlab="TEMPERATURE!LOOP";
							setrangss = pdbuffer.jautocmd.DEVLIST.AIRCON.RUNLOOP[tmlab];
							settmlow = setrangss.substr(0,4);
							settmhi = setrangss.substr(4,4);
							console.log("loadx2 low , hi ="+settmlow+" "+settmhi);
							pdbuffer.jautocmd.WATERLOOP.autotmloop.CHKLOOP.CHKVALUE.INTM_LOW = Number(settmhi);
							
							pdbuffer.jautocmd.WATERLOOP.autotmloop.CHKLOOP.CHKVALUE.INTM_LEVLIST[2]= Number(settmhi);
							pdbuffer.jautocmd.WATERLOOP.autotmloop.CHKLOOP.CHKVALUE.INTM_LEVLISTUP[2]= Number(settmhi)+20;
							pdbuffer.jautocmd.WATERLOOP.autotmloop.CHKLOOP.CHKVALUE.INTM_LEVLISTDOWN[2]= Number(settmhi)-20;
							
							pdbuffer.jautocmd.WATERLOOP.autotmloop.CHKLOOP.CHKVALUE.INTM_LEVLIST[1]= Number(settmlow);
							pdbuffer.jautocmd.WATERLOOP.autotmloop.CHKLOOP.CHKVALUE.INTM_LEVLISTUP[1]= Number(settmlow)+20;
							pdbuffer.jautocmd.WATERLOOP.autotmloop.CHKLOOP.CHKVALUE.INTM_LEVLISTDOWN[1]= Number(settmlow)-20;
							
							pdbuffer.jautocmd.WATERLOOP.autotmloop.CHKLOOP.CHKVALUE.OUTTM_LOW = Number(settmhi);
							pdbuffer.jautocmd.WATERLOOP.autotmloop.CHKLOOP.CHKVALUE.OUTTM_LEVLIST[2]= Number(settmhi);
							pdbuffer.jautocmd.WATERLOOP.autotmloop.CHKLOOP.CHKVALUE.OUTTM_LEVLIST[1]= Number(settmlow);
						}
					}
					//keep the auto save up to buffer ### 20180913 by QA aircon test use 
					pdbuffer.jautocmd_update(()=>{
							console.log("JAUTO Save ok !");
					});//update buffer to Files
					
				}
				//####
				
				break
			case "SET":
				res.json(jobj);
				
				if(pos == "0000"){//when pos ="0000" is load default auto json 
					for(jaa in pdbuffer.jautocmd.DEFAUTOLIST){
						pdbuffer.jautocmd.DEVLIST[jaa] = pdbuffer.jautocmd.DEFAUTOLIST[jaa];
					}
					pdbuffer.jautocmd_update(()=>{
						console.log("JAUTO Save ok !");
									
					});//update buffer to Files
					return;
				}
				
				//autojsonloadurl = "http://tscloud.opcom.com/Cloud/API/v2/AUTOJSON?SID="+cstu;
				autojsonloadurl =  pdbuffer.pdjobj.PDDATA.v2autojsonloadurl+"?SID="+cstu;
				console.log("get ok...["+pos+"] link>>"+autojsonloadurl);
				if(pos == "DOSE"){					
					client.get(autojsonloadurl, function (data, response) {	
						console.log("get auto json ok...["+pos+"]>>"+JSON.stringify(data));
						//console.log("get auto json ok...sch_autoloadmark ="+JSON.stringify(autocmd.sch_autoloadmark));						
						if(!((typeof data) == 'object'))return;
						
						ddjdata = jobjcopy(data);
						if("DOSEA" in ddjdata){
							for(dda in ddjdata.DOSEA.SCHEDULE.EPOS){
								sec02val = Number(ddjdata.DOSEA.SCHEDULE.EPOS[dda].STU.substr(2,4));
								sec02str = "0000"+sec02val.toString(16)
								sec02valhex = ddjdata.DOSEA.SCHEDULE.EPOS[dda].STU.substr(0,2)+sec02str.substr((sec02str.length-4),4);
								ddjdata.DOSEA.SCHEDULE.EPOS[dda].STU = sec02valhex;		
							}
							pdbuffer.jautocmd.DEVLIST.DOSEA = jobjcopy(ddjdata.DOSEA);
							pdbuffer.jautocmd.DEVLIST.DOSEA.STATU=1;
							autocmd.load_autojob("DOSEA",pdbuffer.jautocmd.DEVLIST.DOSEA)
							if("DOSEA" in autocmd.sch_autojob)autocmd.sch_autojob.DOSEA.STATU=1;
							if(!("DOSEA" in autocmd.sch_autoloadmark))autocmd.sch_autoloadmark.DOSEA=0;
						};
						if("DOSEB" in ddjdata){
							for(dda in ddjdata.DOSEB.SCHEDULE.EPOS){
								sec02val = Number(ddjdata.DOSEB.SCHEDULE.EPOS[dda].STU.substr(2,4));
								sec02str = "0000"+sec02val.toString(16)
								sec02valhex = ddjdata.DOSEB.SCHEDULE.EPOS[dda].STU.substr(0,2)+sec02str.substr((sec02str.length-4),4);
								ddjdata.DOSEB.SCHEDULE.EPOS[dda].STU = sec02valhex;		
							}
							pdbuffer.jautocmd.DEVLIST.DOSEB = jobjcopy(ddjdata.DOSEB);
							pdbuffer.jautocmd.DEVLIST.DOSEB.STATU=1;
							autocmd.load_autojob("DOSEB",pdbuffer.jautocmd.DEVLIST.DOSEB)
							if("DOSEB" in autocmd.sch_autojob)autocmd.sch_autojob.DOSEB.STATU=1;
							if(!("DOSEB" in autocmd.sch_autoloadmark))autocmd.sch_autoloadmark.DOSEB=0; 
						};
						if("DOSEC" in ddjdata){
							for(dda in ddjdata.DOSEC.SCHEDULE.EPOS){
								sec02val = Number(ddjdata.DOSEC.SCHEDULE.EPOS[dda].STU.substr(2,4));
								sec02str = "0000"+sec02val.toString(16)
								sec02valhex = ddjdata.DOSEC.SCHEDULE.EPOS[dda].STU.substr(0,2)+sec02str.substr((sec02str.length-4),4);
								ddjdata.DOSEC.SCHEDULE.EPOS[dda].STU = sec02valhex;		
							}
							pdbuffer.jautocmd.DEVLIST.DOSEC = jobjcopy(ddjdata.DOSEC);
							pdbuffer.jautocmd.DEVLIST.DOSEC.STATU=1;
							autocmd.load_autojob("DOSEC",pdbuffer.jautocmd.DEVLIST.DOSEC)
							if("DOSEC" in autocmd.sch_autojob)autocmd.sch_autojob.DOSEC.STATU=1;
							if(!("DOSEC" in autocmd.sch_autoloadmark))autocmd.sch_autoloadmark.DOSEC=0; 
						};
						if("DOSED" in ddjdata){
							for(dda in ddjdata.DOSED.SCHEDULE.EPOS){
								sec02val = Number(ddjdata.DOSED.SCHEDULE.EPOS[dda].STU.substr(2,4));
								sec02str = "0000"+sec02val.toString(16)
								sec02valhex = ddjdata.DOSED.SCHEDULE.EPOS[dda].STU.substr(0,2)+sec02str.substr((sec02str.length-4),4);
								ddjdata.DOSED.SCHEDULE.EPOS[dda].STU = sec02valhex;		
							}
							pdbuffer.jautocmd.DEVLIST.DOSED = jobjcopy(ddjdata.DOSED);
							pdbuffer.jautocmd.DEVLIST.DOSED.STATU=1;
							autocmd.load_autojob("DOSED",pdbuffer.jautocmd.DEVLIST.DOSED)
							if("DOSED" in autocmd.sch_autojob)autocmd.sch_autojob.DOSED.STATU=1;
							if(!("DOSED" in autocmd.sch_autoloadmark))autocmd.sch_autoloadmark.DOSED=0; 
						};
						
						pdbuffer.jautocmd_update(()=>{
								console.log("DOSE A,B,C,D JAUTO Save ok !");
						});//update buffer to Files
						
					}).on("error", function(err) {console.log("err for client");});				
					
				}else if(pos == "OPWAVE"){										
					client.get(autojsonloadurl, function (data, response) {					
						console.log("get auto json ok...["+pos+"]>>"+JSON.stringify(data));
						//jobj = jobjcopy(response)						
						if(!((typeof data) == 'object'))return;
						
						jobj =  jobjcopy(data);
						if("MODE" in jobj){//check is auto JSON format 
							//console.log(">>autox43");
							jobj.STATU=1;
							pdbuffer.jautocmd.DEVLIST[pos] =  jobjcopy(jobj);
							autocmd.load_autojob(pos,pdbuffer.jautocmd.DEVLIST[pos]);//load json to buffer 
							pdbuffer.jautocmd_update(()=>{
									console.log("JAUTO Save ok !");
							});//update buffer to Files
						}
					}).on("error", function(err) {console.log("err for client");});
				}else{						
					client.get(autojsonloadurl, function (data, response) {					
						console.log("get auto json ok...["+pos+"]>>"+JSON.stringify(data));
						//jobj = jobjcopy(response)
						if(!((typeof data) == 'object'))return;
						
						jobj =  jobjcopy(data);
						if("MODE" in jobj){//check is auto JSON format 
							//console.log(">>autox43");
							pdbuffer.jautocmd.DEVLIST[pos] =  jobjcopy(jobj);
							autocmd.load_autojob(pos,pdbuffer.jautocmd.DEVLIST[pos]);//load json to buffer 
							pdbuffer.jautocmd_update(()=>{
									console.log("JAUTO Save ok !");
							});//update buffer to Files
						}
					}).on("error", function(err) {console.log("err for client");});
				}
				
				break;
			default:
				res.json(jobj);
				console.log(cregadd+" not define =>"+cmd);	
				return
		}
		
	});	
});

//=====================================================
// KeyPAD function command call api 
//=====================================================
router.get('/KEYSETUP',function(req,res,next){	//ok	
	console.log(req.query);	
	let cmd = req.query.Action
	let uuid = req.query.UUID
	let pos = req.query.POS
	//let group = Number(req.query.GROUP)
	let group = req.query.GROUP
	let cstu = req.query.STU
	
	//console.log("API cmd ="+cmd+" uuid="+uuid+" pos="+pos+" group="+group);
	vcmdapipamcheck(res,cmd,uuid,pos,group,cstu,()=>{
		let cmdindex=0;
		let jobj = { "success" : "false" };  
		
		if(cmd in pdbuffer.pdjobj.subcmd)cmdindex = pdbuffer.pdjobj.subcmd[cmd]
		
		if(pos in pdbuffer.jkeypd.KEYLIB){ //check keypad is define 
			if(group in pdbuffer.jkeypd.KEYLIB[pos]){ //check pos is working 
				if(cmdindex <= 1){
					console.log("OFF/ON Command only by pos = 0000");
					res.json(jobj);
					return;// OFF /ON must POS="0000"
				}
			}else{			
				if(pos != "0000" ){  // OFF /ON must POS="0000"
					if(cmd !="SET"){
						res.json(jobj);
						return;//if new POS must use SET
					}
				}
			}
		}else{
			if(pos =="0000" && group=="0000"){
				if(cmdindex > 1){					
					console.log("OFF/ON Command only by pos = "+pos);
					res.json(jobj);
					return;// OFF /ON must POS="0000"
				}
			}else{					
				console.log("KEYPDA No Define ="+pos);
				res.json(jobj);
				return;
			}
		}
		
		jobj = {  "success" : "true"  }; 
		switch(cmd){//sch subcmd //"f5 20 08 00 02 14 12 34 12 34 13" 14920000A0
			case "OFF":
				res.json(jobj);
				if(pos == "0000")pdbuffer.jkeypd_load(()=>{
					console.log("JAUTO reload ok !");
				});//reload files to buffer
				break
			case "ON":
				res.json(jobj);
				if(pos == "0000")pdbuffer.jkeypd_update(()=>{
					console.log("JAUTO Save ok !");
				});//update buffer to Files
				break
			case "LOAD":			
				jobj = pdbuffer.jkeypd.KEYLIB[pos][group];
				res.json(jobj);	
				break
			case "AUTO"://POS= KEYPAD , GROUP = keyno ,STU=key action(ON/OFF/AUTO) 
				res.json(jobj);
				autocmd.active_keypadjob(pos,group,cstu);//pos = KEYPAD0 , group = "K021" , STU=:ON75"
				
				break
			case "SET":
				res.json(jobj);				
				
				//autojsonloadurl = "http://tscloud.opcom.com/Cloud/API/v2/AUTOJSON?SID="+cstu;	
				autojsonloadurl =  pdbuffer.pdjobj.PDDATA.v2keypadjsonloadurl+"?SID="+cstu;			
				console.log("get ok...["+pos+"] link>>"+autojsonloadurl);
				client.get(autojsonloadurl, function (data, response) {					
					console.log("get auto json ok...["+pos+"]>>"+JSON.stringify(data));
					//jobj = jobjcopy(response)
					jobj =  jobjcopy(data);					
					if("STATUS" in jobj){//check is auto JSON format 
						pdbuffer.jkeypd.KEYLIB[pos][group] =  jobjcopy(jobj);
						
						pdbuffer.jkeypd.KEYLIB[pos][group].STATUS.korglist=[]
						for(kk in pdbuffer.jkeypd.KEYLIB[pos][group]){
							if(kk ==  "STATUS")continue;
							pdbuffer.jkeypd.KEYLIB[pos][group].STATUS.korglist.push(kk);
						}
						pdbuffer.jkeypd.KEYLIB[pos][group].STATUS.evncount = pdbuffer.jkeypd.KEYLIB[pos][group].STATUS.korglist.length
						pdbuffer.jkeypd_update(()=>{
							console.log("JAUTO Save ok !");
						});//update buffer to Files
						
					}
					
				}).on("error", function(err) {console.log("err for client");});
				
				break
			default:
				console.log(cregadd+" not define =>"+cmd);	
				return
		}	
				
	});	
});

//=====================================================
// Device change setup ipadd by macadd  set ipadd or group code ### 20180908
// 設備維修 更換 設定指令  參照 POS name 
//======================================================
router.get('/IPADDMACSETUP',function(req,res,next){	
	console.log(req.query);	
	let cmd = req.query.Action
	let uuid = req.query.UUID
	let pos = req.query.POS
	let group = Number('0x'+req.query.GROUP)
	let cstu = req.query.STU
	
	//console.log("API cmd ="+cmd+" uuid="+uuid+" pos="+pos+" group="+group);
	apipamcheck(res,cmd,uuid,pos,group,cstu,()=>{
		//pos = POS , STU=macadd, GROUP = group + IPADD
		
		let ttbuf = ""	                                    //[0] [1][2][3][4][5][6][7][8][9] [10][11][12][13][14]
		ttbuf = Buffer.from(cmdcode.rs485v050.se1cmd,'hex');//"f5 fd  0c 00 04 e1 12 34 56 78 90   12  00  00 e1"

		let ttbuf2 = ""	   //F5 IPAddr 06 12 04 1F 00 group check
		ttbuf2 = Buffer.from(cmdcode.rs485v050.sb0cmd,'hex');
		if(pos in pdbuffer.pdjobj.PDDATA.Devtab){ //check pos is working 
		   ipadd = pdbuffer.pdjobj.PDDATA.Devtab[pos].STATU.devadd;
		}else{			
		   return;
		}
		if( (cstu.length <12)||(cstu.substr(0,1)!='8') )return;
		
		switch(cmd){//sch subcmd //"f5 20 08 00 02 14 12 34 12 34 13" 14920000A0
			case "LOAD":
				break
			case "ON"://setup GROUP by IPADD
				console.log("set pos="+pos+" ipadd="+ipadd+" group="+group+"by cmd="+cmd);	
				
				//set group by ipadd
				ttbuf2[1]= ipadd;//ipadd 0x20
				ttbuf2[4]= 0x04;	//subcmd code set		
				ttbuf2[5]= 0x1f;	//### regadd data by ipadd setup
				ttbuf2[6]= 0x00;	//### regadd data by ipadd setup
				ttbuf2[7]= group;	//### regadd data by ipadd setup		  
				
				pdbuffer.totxbuff(ttbuf2);
				break
			case "SET"://setup IPADD by MACADD
				console.log("set pos="+pos+" ipadd="+ipadd+" group="+group+"by cmd="+cmd);	
				
				//set ipadd by macadd 
				ttbuf[1]= 0xfd;//ipadd 
				ttbuf[4]= 0x04;	//subcmd code set		
				ttbuf[5]= 0xe1;	//### regadd data by ipadd setup
				
				ttbuf[6]= Number('0x'+cstu.substr(0,2));//### indexH;	//### macadd 1 byte
				ttbuf[7]= Number('0x'+cstu.substr(2,2));	//### macadd 2 byte
				ttbuf[8]= Number('0x'+cstu.substr(4,2));	//### macadd 3 byte
				ttbuf[9]= Number('0x'+cstu.substr(6,2));	//### macadd 4 byte
				ttbuf[10]= Number('0x'+cstu.substr(8,2));//### macadd 5 byte
				ttbuf[11]= Number('0x'+cstu.substr(10,2));//### macadd 6 byte
				
				ttbuf[12]= 0x00;//### ipadd 1 byte
				ttbuf[13]= ipadd ;//### ipadd 2 byte
				
				pdbuffer.totxbuff(ttbuf);
								
				//set group by ipadd
				ttbuf2[1]= ipadd;   //ipadd 
				ttbuf2[4]= 0x04;	//subcmd code set		
				ttbuf2[5]= 0x1f;	//### regadd data by ipadd setup
				ttbuf2[6]= 0x00;	//### regadd data by ipadd setup
				ttbuf2[7]= group;	//### regadd data by ipadd setup		  
				
				pdbuffer.totxbuff(ttbuf2);
				//ttbuf[6]= Number('0x'+cstu.substr(2,2));//### keycode
				//ttbuf[7]= Number('0x'+cstu.substr(4,2));//### keystu (0:off/1:on)
				
				//ttbuf[8]= Number('0x'+cstu.substr(6,2));//### group H
				//ttbuf[9]= Number('0x'+cstu.substr(8,2));//### group L  				
				break
			default:
				console.log(cregadd+" not define =>"+cmd);	
				return
		}
		
	});	
});


//=======================================================
//device Fail funciton on/off api command KEYPAD1#K09A by PUMP alarm ,KEYPAD1#K09B by LED alarm 
// 設備自動報警 功能開啟 或 關閉 by POS name 
//=======================================================
router.get('/DEVALARMSET',function(req,res,next){	
	console.log(req.query);	
	let cmd = req.query.Action
	let uuid = req.query.UUID
	let pos = req.query.POS
	let group = Number('0x'+req.query.GROUP);
	let cstu = req.query.STU
	
	//console.log("API cmd ="+cmd+" uuid="+uuid+" pos="+pos+" group="+group);
	apipamcheck(res,cmd,uuid,pos,group,cstu,()=>{
		//pos = POS , STU=macadd, GROUP = group + IPADD
		//[0][1][2][3][4][5][6][7][8][9][10][11][12][13][14]
		//f5 21 0a 00 09 20 01 2c 1f ff 00  20  ff  
		//[6][7]=> scan delay time  [8][9]=>高值 [10][11]=>低值 [4]comm =0x09 start , 0x08 stop [5]=>REG [1]=IPADD 
		let ttbuf = ""	                                   
		let devalarmcmd = "f5210a000920012c1fff0020ff";     
		ttbuf = Buffer.from(devalarmcmd,'hex');//"f5 fd  0c 00 04 e1 12 34 56 78 90   12  00  00 e1"

		//let ttbuf2 = ""	   //F5 IPAddr 06 12 04 1F 00 group check
		//ttbuf2 = Buffer.from(cmdcode.rs485v050.sb0cmd,'hex');
		
		if(pos in pdbuffer.pdjobj.PDDATA.Devtab){ //check pos is working 
		   ipadd = pdbuffer.pdjobj.PDDATA.Devtab[pos].STATU.devadd;
		}else{			
		   return;
		}
		if(cstu.length <12)return;
		//if pos = E002 then group = regadd
		
		switch(cmd){//sch subcmd //"f5 20 08 00 02 14 12 34 12 34 13" 14920000A0
			case "OFF":
				console.log("device auto alarm off pos="+pos+" ipadd="+ipadd+" group="+group+"by stu="+cstu);
				devalarmcmd = "f5210a0008200000ff";     
				ttbuf = Buffer.from(devalarmcmd,'hex');//"f5 fd  0c 00 04 e1 12 34 56 78 90   12  00  00 e1"
				if(ipadd == 0x21){
					ttbuf[1]= 0x21;		//ipadd 	
					ttbuf[4]= 0x08;		//### subcmd setup
					ttbuf[5]= group;	//### regadd data by ipadd setup
					
					pdbuffer.totxbuff(ttbuf);
				}else{
					ttbuf[1]= ipadd;	//ipadd 	
					ttbuf[4]= 0x08;		//### subcmd setup
					ttbuf[5]= 0x20;		//### regadd data by ipadd setup
					
					pdbuffer.totxbuff(ttbuf);
				}
				break
			case "ON"://setup GROUP by IPADD
				console.log("device auto alarm on pos="+pos+" ipadd="+ipadd+" group="+group+"by stu="+cstu);	
				devalarmcmd = "f5210a000920012c1fff0020ff";     
				ttbuf = Buffer.from(devalarmcmd,'hex');//"f5 fd  0c 00 04 e1 12 34 56 78 90   12  00  00 e1"
				if(ipadd == 0x21){					
					ttbuf[1]= 0x21;		//ipadd 	
					ttbuf[4]= 0x09;		//### subcmd setup
					ttbuf[5]= group;	//### regadd data by ipadd setup
					
					ttbuf[6]= Number('0x'+cstu.substr(0,2));	//### checktime hi byte
					ttbuf[7]= Number('0x'+cstu.substr(2,2));	//### checktime low byte
					ttbuf[8]= Number('0x'+cstu.substr(4,2));	//### upchk hi byte
					ttbuf[9]= Number('0x'+cstu.substr(6,2));	//### upchk low byte
					ttbuf[10]= Number('0x'+cstu.substr(8,2));	//### downchk hi byte
					ttbuf[11]= Number('0x'+cstu.substr(10,2));	//### downchk low byte
					
					pdbuffer.totxbuff(ttbuf);
				}else{
					ttbuf[1]= ipadd;	//ipadd 	
					ttbuf[4]= 0x09;		//### subcmd setup
					ttbuf[5]= 0x20;		//### regadd data by ipadd setup
					
					ttbuf[6]= Number('0x'+cstu.substr(0,2));	//### checktime hi byte
					ttbuf[7]= Number('0x'+cstu.substr(2,2));	//### checktime low byte
					ttbuf[8]= Number('0x'+cstu.substr(4,2));	//### upchk hi byte
					ttbuf[9]= Number('0x'+cstu.substr(6,2));	//### upchk low byte
					ttbuf[10]= Number('0x'+cstu.substr(8,2));	//### downchk hi byte
					ttbuf[11]= Number('0x'+cstu.substr(10,2));	//### downchk low byte
					
					pdbuffer.totxbuff(ttbuf);
				}
				break
			default:
				console.log(cregadd+" not define =>"+cmd);	
				return
		}
		
	});	
});

//=======================================================
// TEMPERATURE = 0000, RH=0001,CO2=0002 
// sensor offset 校正值 操作介面 API
//=======================================================
router.get('/TMDEVICECAL',function(req,res,next){	
	console.log(req.query);	
	let cmd = req.query.Action
	let uuid = req.query.UUID
	let pos = req.query.POS
	let group = Number(req.query.GROUP)
	let cstu = req.query.STU
	
	//console.log("API cmd ="+cmd+" uuid="+uuid+" pos="+pos+" group="+group);
	vcmdapipamcheck(res,cmd,uuid,pos,group,cstu,()=>{
		
		
		jobj = {  "success" : "true"  }; 
		switch(cmd){//sch subcmd //"f5 20 08 00 02 14 12 34 12 34 13" 14920000A0
			case "LOAD":	
				//pdbuffer.jautocmd.DEVICESET.CHKLOADTM.H001 = 31;
				//pdbuffer.jautocmd.DEVICESET.CHKLOADTM.H002 = 32;
				//pdbuffer.jautocmd.DEVICESET.CHKLOADTM.H003 = 33;
				//pdbuffer.jautocmd.DEVICESET.CHKLOADTM.H004 = 34;
				//pdbuffer.jautocmd.DEVICESET.CHKLOADTM.H005 = 35;
				//pdbuffer.jautocmd.DEVICESET.CHKLOADTM.H006 = 36;
				//pdbuffer.jautocmd.DEVICESET.CHKLOADTM.E002 = 37;
				
				if(pos == "0000")jobj = jobjcopy(pdbuffer.jautocmd.DEVICESET.CHKLOADTM);//LOAD TM
				if(pos == "0001")jobj = jobjcopy(pdbuffer.jautocmd.DEVICESET.CHKLOADRH);//LOAD RH
				if(pos == "0002")jobj = jobjcopy(pdbuffer.jautocmd.DEVICESET.CHKLOADCO2);//LOAD CO2
				
				console.log(JSON.stringify(jobj));
				res.json(jobj);	
				break
			case "SET":
				res.json(jobj);
				tmdat = cstu.split(",");
				
				if(pos=="0000"){// pos="0000" is TM
					if(tmdat.length >=7){
						pdbuffer.jautocmd.DEVICESET.OFFSETTM.H001 =  Number(tmdat[0]);
						pdbuffer.jautocmd.DEVICESET.OFFSETTM.H002 =  Number(tmdat[1]);
						pdbuffer.jautocmd.DEVICESET.OFFSETTM.H003 =  Number(tmdat[2]);
						pdbuffer.jautocmd.DEVICESET.OFFSETTM.H004 =  Number(tmdat[3]);
						pdbuffer.jautocmd.DEVICESET.OFFSETTM.H005 =  Number(tmdat[4]);
						pdbuffer.jautocmd.DEVICESET.OFFSETTM.H006 =  Number(tmdat[5]);
						pdbuffer.jautocmd.DEVICESET.OFFSETTM.E002 =  Number(tmdat[6]);
						
						pdbuffer.jautocmd_update(()=>{
								console.log("JAUTO Save ok !");
						});//update buffer to Files
					}
					
					jobj = jobjcopy(pdbuffer.jautocmd.DEVICESET.OFFSETTM);
					console.log("offsetTM= "+JSON.stringify(jobj));
				}
				if(pos=="0001"){// pos = "0001" is RH
					if(tmdat.length >=7){
						pdbuffer.jautocmd.DEVICESET.OFFSETRH.H001 =  Number(tmdat[0]);
						pdbuffer.jautocmd.DEVICESET.OFFSETRH.H002 =  Number(tmdat[1]);
						pdbuffer.jautocmd.DEVICESET.OFFSETRH.H003 =  Number(tmdat[2]);
						pdbuffer.jautocmd.DEVICESET.OFFSETRH.H004 =  Number(tmdat[3]);
						pdbuffer.jautocmd.DEVICESET.OFFSETRH.H005 =  Number(tmdat[4]);
						pdbuffer.jautocmd.DEVICESET.OFFSETRH.H006 =  Number(tmdat[5]);
						pdbuffer.jautocmd.DEVICESET.OFFSETRH.E002 =  Number(tmdat[6]);
						
						pdbuffer.jautocmd_update(()=>{
								console.log("JAUTO Save ok !");
						});//update buffer to Files
					}
					
					jobj = jobjcopy(pdbuffer.jautocmd.DEVICESET.OFFSETRH);
					console.log("offsetRH= "+JSON.stringify(jobj));
				}				
				if(pos=="0002"){// pos = "0002" is CO2
					if(tmdat.length >=7){
						pdbuffer.jautocmd.DEVICESET.OFFSETCO2.H001 =  Number(tmdat[0]);
						pdbuffer.jautocmd.DEVICESET.OFFSETCO2.H002 =  Number(tmdat[1]);
						pdbuffer.jautocmd.DEVICESET.OFFSETCO2.H003 =  Number(tmdat[2]);
						pdbuffer.jautocmd.DEVICESET.OFFSETCO2.H004 =  Number(tmdat[3]);
						pdbuffer.jautocmd.DEVICESET.OFFSETCO2.H005 =  Number(tmdat[4]);
						pdbuffer.jautocmd.DEVICESET.OFFSETCO2.H006 =  Number(tmdat[5]);
						pdbuffer.jautocmd.DEVICESET.OFFSETCO2.E002 =  Number(tmdat[6]);
						
						pdbuffer.jautocmd_update(()=>{
								console.log("JAUTO Save ok !");
						});//update buffer to Files
					}
					
					jobj = jobjcopy(pdbuffer.jautocmd.DEVICESET.OFFSETCO2);
					console.log("offsetCO2= "+JSON.stringify(jobj));
				}
				
				break;
			default:
				res.json(jobj);
				console.log(cregadd+" not define =>"+cmd);	
				return
		}
	});	
});

//=======================================================
//TEMPERATURE AUTO Controk DEMO 
//溫控 LiveDEMO 操作介面 API 
//=======================================================
router.get('/TMLIVEDEMO',function(req,res,next){	
	console.log(req.query);	
	let cmd = req.query.Action
	let uuid = req.query.UUID
	let pos = req.query.POS
	let group = Number(req.query.GROUP)
	let cstu = req.query.STU
	
	//console.log("API cmd ="+cmd+" uuid="+uuid+" pos="+pos+" group="+group);
	vcmdapipamcheck(res,cmd,uuid,pos,group,cstu,()=>{
		
		jobj = {  "success" : "true"  }; 
		switch(cmd){//sch subcmd //"f5 20 08 00 02 14 12 34 12 34 13" 14920000A0
			case "ON":
				res.json(jobj);
				console.log("tmdemo cstu = "+cstu);
				
				if(cstu=="LEDON")pdbuffer.jautocmd.WATERLOOP.tmdemoloop.SENSOR_CONTROL = 21;
				if(cstu=="LEDOFF")pdbuffer.jautocmd.WATERLOOP.tmdemoloop.SENSOR_CONTROL = 31;
				pdbuffer.jautocmd.WATERLOOP.tmdemoloop.CHKLOOP.CHKVALUE.OUTMODE = group;
				pdbuffer.jautocmd.WATERLOOP.tmdemoloop.STATU = 1;
				
				democtiveurl = "http://106.104.112.56/Cloud/API/v2/Demotest.php?UUID="+pdbuffer.setuuid+"&STU=1"
				console.log(">>tm demo mode send to =>"+democtiveurl);
				client.get(democtiveurl, function (data, response) {
					console.log("demo client active  ok ...");
				}).on("error", function(err) {console.log("err for client");});			
				
				democtiveurl = "http://192.168.5.220/API/v2/Demotest.php?UUID="+pdbuffer.setuuid+"&STU=1"
				console.log(">>ipc tm demo mode send to =>"+democtiveurl);
				client.get(democtiveurl, function (data, response) {
					console.log("demo client active  ok ...");
				}).on("error", function(err) {console.log("err for client");});			
			
			if(group>=1 && group <=3)autocmd.autoeventcall('sec30status_event'); 
			
				console.log("tmdemo cstu = "+cstu + " outmode = "+pdbuffer.jautocmd.WATERLOOP.tmdemoloop.CHKLOOP.CHKVALUE.OUTMODE);
				break;
			case "OFF":
				res.json(jobj);
				pdbuffer.jautocmd.WATERLOOP.tmdemoloop.SENSOR_CONTROL = 3;
				pdbuffer.jautocmd.WATERLOOP.tmdemoloop.STATU = 1;
					
				democtiveurl = "http://106.104.112.56/Cloud/API/v2/Demotest.php?UUID="+pdbuffer.setuuid+"&STU=0"
				console.log(">>tm demo mode send to =>"+democtiveurl);
				client.get(democtiveurl, function (data, response) {
					console.log("demo client active  ok ...");
				}).on("error", function(err) {console.log("err for client");});		
					
				democtiveurl = "http://192.168.5.220/API/v2/Demotest.php?UUID="+pdbuffer.setuuid+"&STU=0"
				console.log(">>ipc tm demo mode send to =>"+democtiveurl);
				client.get(democtiveurl, function (data, response) {
					console.log("demo client active  ok ...");
				}).on("error", function(err) {console.log("err for client");});			
				
			autocmd.autoeventcall('sec30status_event'); 
			
				console.log("tmdemo cstu = "+cstu + " mode = "+ pdbuffer.jautocmd.WATERLOOP.tmdemoloop.SENSOR_CONTROL);	
				
				break;
			default:
				res.json(jobj);
				console.log(cregadd+" not define =>"+cmd);	
				return
		}	
				
	});	
});


//=====================================================
// 縮時錄影 啟動及停止
// IPCAM ON or OFF , POS=0000,0906,0907,0908,0909 選哪支, STU=0001，0004，0006，0008 多久觸發一次
//=====================================================
ipcamlist = ["C906","C907","C908","C909"];

router.get('/IPCAMVIDEO',function(req,res,next){	
	console.log(req.query);	
	let cmd = req.query.Action
	let uuid = req.query.UUID
	let pos = req.query.POS
	let group = Number(req.query.GROUP)
	let cstu = req.query.STU
	
	//console.log("API cmd ="+cmd+" uuid="+uuid+" pos="+pos+" group="+group);
	//apipamcheck(res,cmd,uuid,pos,group,cstu,()=>{
	vcmdapipamcheck(res,cmd,uuid,pos,group,cstu,()=>{
		
		jobj = {  "success" : "true"  }; 
		res.json(jobj);		
		console.log("IPCAM set start = "+pos);
		
		switch(cmd){//sch subcmd 
			case "ON"://start video recode and stop OPWAVE auto flag
				switch(pos){
					case "C906":
						camontime = cstu.substr(0,4);
						pdbuffer.jautocmd.DEVLIST.IPCAMC906.TIMER.ON = camontime;
						
						pdbuffer.jautocmd.DEVLIST.IPCAMC906.STATU=1;
						autocmd.load_autojob("IPCAMC906",pdbuffer.jautocmd.DEVLIST.IPCAMC906);
						
						pdbuffer.jautocmd.DEVLIST.OPWAVE.STATU = 0;
						if("OPWAVE" in autocmd.sch_autojob)autocmd.sch_autojob.OPWAVE.STATU=0;
						
						//console.log("C906 IPCAM set start "+ JSON.stringify(pdbuffer.jautocmd.DEVLIST.IPCAMC906) );	
						break;
					case "C907":
						camontime = cstu.substr(0,4);
						pdbuffer.jautocmd.DEVLIST.IPCAMC907.TIMER.ON = camontime;
						
						pdbuffer.jautocmd.DEVLIST.IPCAMC907.STATU=1;
						autocmd.load_autojob("IPCAMC907",pdbuffer.jautocmd.DEVLIST.IPCAMC907);
						
						pdbuffer.jautocmd.DEVLIST.OPWAVE.STATU = 0;
						if("OPWAVE" in autocmd.sch_autojob)autocmd.sch_autojob.OPWAVE.STATU=0;
						
						//console.log("C907 IPCAM set start "+ JSON.stringify(pdbuffer.jautocmd.DEVLIST.IPCAMC907) );	
						break;
					case "C908":
						camontime = cstu.substr(0,4);
						pdbuffer.jautocmd.DEVLIST.IPCAMC908.TIMER.ON = camontime;
						
						pdbuffer.jautocmd.DEVLIST.IPCAMC908.STATU=1;
						autocmd.load_autojob("IPCAMC908",pdbuffer.jautocmd.DEVLIST.IPCAMC908);

						pdbuffer.jautocmd.DEVLIST.OPWAVE.STATU = 0;
						if("OPWAVE" in autocmd.sch_autojob)autocmd.sch_autojob.OPWAVE.STATU=0;
						
						//console.log("C908 IPCAM set start "+ JSON.stringify(pdbuffer.jautocmd.DEVLIST.IPCAMC908) );	
						break;
					case "C909":
						camontime = cstu.substr(0,4);
						pdbuffer.jautocmd.DEVLIST.IPCAMC909.TIMER.ON = camontime;
						
						pdbuffer.jautocmd.DEVLIST.IPCAMC909.STATU=1;
						autocmd.load_autojob("IPCAMC909",pdbuffer.jautocmd.DEVLIST.IPCAMC909);

						pdbuffer.jautocmd.DEVLIST.OPWAVE.STATU = 0;
						if("OPWAVE" in autocmd.sch_autojob)autocmd.sch_autojob.OPWAVE.STATU=0;
						
						//console.log("C909 IPCAM set start "+ JSON.stringify(pdbuffer.jautocmd.DEVLIST.IPCAMC909) );	
						break;
					default:
						return;
				}				
				pdbuffer.jautocmd_update(()=>{
					console.log("JAUTO Save ok !");						
					autocmd.autoeventcall('sensorcheck_event'); 
				});
				
				break;
			case "OFF"://stop video recode and stop OPWAVE auto flag
				switch(pos){
					case "C906":
						pdbuffer.jautocmd.DEVLIST.IPCAMC906.STATU = 0;			
						if("IPCAMC906" in autocmd.sch_autojob)autocmd.sch_autojob.IPCAMC906.STATU=0;						
						if( autocmd.sch_autojob.IPCAMC906.stid != null)clearTimeout( autocmd.sch_autojob.IPCAMC906.stid);//clear  on/off command
						
						democtiveurl = "http://192.168.5.220/Query/TimeLams.php?UUID="+pdbuffer.setuuid+"&IPCAM=C906&Statu=0"
						console.log(">>ipc tm demo mode send to =>"+democtiveurl);
						client.get(democtiveurl, function (data, response) {
							console.log("demo C906 client active  ok ...");
						}).on("error", function(err) {console.log("err for client");});	
						
						break;
						
					case "C907":
						pdbuffer.jautocmd.DEVLIST.IPCAMC907.STATU = 0;
						if("IPCAMC907" in autocmd.sch_autojob)autocmd.sch_autojob.IPCAMC907.STATU=0;						
						if( autocmd.sch_autojob.IPCAMC907.stid != null)clearTimeout(autocmd.sch_autojob.IPCAMC907.stid);//clear  on/off command 
						
						democtiveurl = "http://192.168.5.220/Query/TimeLams.php?UUID="+pdbuffer.setuuid+"&IPCAM=C907&Statu=0"
						console.log(">>ipc tm demo mode send to =>"+democtiveurl);
						client.get(democtiveurl, function (data, response) {
							console.log("demo C907 client active  ok ...");
						}).on("error", function(err) {console.log("err for client");});	
						break;
						
					case "C908":
						pdbuffer.jautocmd.DEVLIST.IPCAMC908.STATU = 0;
						if("IPCAMC908" in autocmd.sch_autojob)autocmd.sch_autojob.IPCAMC908.STATU=0;
						if( autocmd.sch_autojob.IPCAMC908.stid != null)clearTimeout( autocmd.sch_autojob.IPCAMC908.stid);//clear  on/off command 
						
						democtiveurl = "http://192.168.5.220/Query/TimeLams.php?UUID="+pdbuffer.setuuid+"&IPCAM=C908&Statu=0"
						console.log(">>ipc tm demo mode send to =>"+democtiveurl);
						client.get(democtiveurl, function (data, response) {
							console.log("demo C908 client active  ok ...");
						}).on("error", function(err) {console.log("err for client");});	
						break;
						
					case "C909":
						pdbuffer.jautocmd.DEVLIST.IPCAMC909.STATU = 0;
						if("IPCAMC909" in autocmd.sch_autojob)autocmd.sch_autojob.IPCAMC909.STATU=0;
						if( autocmd.sch_autojob.IPCAMC909.stid != null)clearTimeout( autocmd.sch_autojob.IPCAMC909.stid);//clear  on/off command 
						
						democtiveurl = "http://192.168.5.220/Query/TimeLams.php?UUID="+pdbuffer.setuuid+"&IPCAM=C909&Statu=0"
						console.log(">>ipc tm demo mode send to =>"+democtiveurl);
						client.get(democtiveurl, function (data, response) {
							console.log("demo C909 client active  ok ...");
						}).on("error", function(err) {console.log("err for client");});	
						break;
					default:
						return;
				}		
				if( (pdbuffer.jautocmd.DEVLIST.IPCAMC906.STATU == 00)&&(pdbuffer.jautocmd.DEVLIST.IPCAMC907.STATU == 00)&&
					(pdbuffer.jautocmd.DEVLIST.IPCAMC908.STATU == 00)&&(pdbuffer.jautocmd.DEVLIST.IPCAMC909.STATU == 00)){
					//start opwave funciton 
					pdbuffer.jautocmd.DEVLIST.OPWAVE.STATU = 1;
					if("OPWAVE" in autocmd.sch_autojob)autocmd.sch_autojob.OPWAVE.STATU=1;
				}
				pdbuffer.jautocmd_update(()=>{
					console.log("JAUTO Save ok !");					
					autocmd.autoeventcall('sensorcheck_event'); 
								
				});
				break;
			default:
				console.log(cregadd+" not define =>"+cmd);	
				return;
		}	
				
	});	
});


/* 
router.get('/PDMACDEV',function(req,res,next){	
	console.log(req.query);	
	let cmd = req.query.Action
	let uuid = req.query.UUID
	let pos = req.query.POS
	let group = Number(req.query.GROUP)
	let cstu = req.query.STU
	
	//console.log("API cmd ="+cmd+" uuid="+uuid+" pos="+pos+" group="+group);
	apipamcheck(res,cmd,uuid,pos,group,cstu,()=>{
		
				
	});	
});

router.get('/SENSORAUTO',function(req,res,next){	
	console.log(req.query);	
	let cmd = req.query.Action
	let uuid = req.query.UUID
	let pos = req.query.POS
	let group = Number(req.query.GROUP)
	let cstu = req.query.STU
	
	//console.log("API cmd ="+cmd+" uuid="+uuid+" pos="+pos+" group="+group);
	apipamcheck(res,cmd,uuid,pos,group,cstu,()=>{
				
	});	
});

router.get('/EVENTID',function(req,res,next){	
	console.log(req.query);	
	let cmd = req.query.Action
	let uuid = req.query.UUID
	let pos = req.query.POS
	let group = Number(req.query.GROUP)
	let cstu = req.query.STU
	
	//console.log("API cmd ="+cmd+" uuid="+uuid+" pos="+pos+" group="+group);
	apipamcheck(res,cmd,uuid,pos,group,cstu,()=>{
				
	});	
});
 */

regcmdchkloop();

//setInterval(function(){			
	//console.log("0xfc command check 0..."+global.arxokflag)
	//treebuff.testflag1 = treebuff.testflag1 +1 ;
	//console.log("regcmd command check 1...",treebuff.testflag1)
	//console.log("regcmd  command show uuid...",pdbuffer.setuuid)
//},3 * 1000 );

module.exports = router;