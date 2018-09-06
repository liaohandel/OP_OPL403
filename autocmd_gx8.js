const vermess = "[opf402 ] start autocmd_gx8 20180701x1 ..."
console.log(vermess);

var EventEmitter = require('events').EventEmitter; 
var event = new EventEmitter(); 
var schedule = require('node-schedule');
var moment = require('moment');

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
var cmdcode = require("./handelrs485x2");


//=== syspub function ===
function jobjcopy(jobj){
	return JSON.parse(JSON.stringify(jobj));	
}

function autoeventcall(callmask){
	event.emit(callmask);
}

event.on('sensorcheck_event', function(){ 
	console.log("sensor check =>"+pdbuffer.jautocmd.AUTOSN);
	if(!("GROWLED" in sch_autojob))reload_autojob();
	for(ii in sch_autojob){
		mpos=ii;
		if(!(mpos in sch_autoloadmark))sch_autoloadmark[mpos]=0;	
		console.log(">>["+mpos+"]auto statu="+sch_autojob[mpos].STATU+" loadmark="+sch_autoloadmark[mpos]);
		if(sch_autojob[mpos].STATU==1){//auto is run enable to event process
			if(sch_autojob[mpos].MODE == 1){ //TIMER
				if(!(mpos in sch_autoloadmark))sch_autoloadmark[mpos]=0;	
				if(sch_autoloadmark[mpos]==0){	
					settimeobj(mpos);//setup mask auto schedule 		
					sch_autoloadmark[mpos]=1;//auto load to times schedule mark flag 0:no 1:load 
					console.log(">>4["+mpos+"]auto time active ="+sch_autoloadmark[mpos]);		
				}				
			}else if(sch_autojob[mpos].MODE == 2){//SCHEDULE
				if(!(mpos in sch_autoloadmark))sch_autoloadmark[mpos]=0;	
				if(sch_autoloadmark[mpos]==0){
					setschobj(mpos);//setup mask auto schedule 		
					sch_autoloadmark[mpos]=1;//auto load to times schedule mark flag 0:no 1:load 
					console.log(">>4["+mpos+"]auto sch active ="+sch_autoloadmark[mpos]);		
				}								
			}else if(sch_autojob[mpos].MODE == 3){//RUNLOOP
				if(!(mpos in sch_autoloadmark))sch_autoloadmark[mpos]=0;	
				if(sch_autoloadmark[mpos]==0){
					sch_autoloadmark[mpos]=1;//auto load to times schedule mark flag 0:no 1:load 
					setrunobj(mpos)		
					console.log(">>4["+mpos+"]auto runloop active ="+sch_autoloadmark[mpos]);	
				}								
			}
		}else if(sch_autojob[mpos].STATU == 0){//auto is disable 
			//console.log(">>5["+mpos+"]auto sch active ="+sch_autoloadmark[mpos]);
			if(sch_autojob[mpos].MODE == 1){			
				if(!(mpos in sch_autoloadmark))sch_autoloadmark[mpos]=0;
				if(sch_autoloadmark[mpos]==1){
					if(sch_autojob[mpos].stid != null)clearTimeout(sch_autojob[mpos].stid);//clear  on/off command 
					sch_autojob[mpos].schobj.cancel();//cancel schdule time active
					sch_autoloadmark[mpos]=0;
					console.log(">>9["+mpos+"]auto sch active ="+sch_autoloadmark[mpos]);				
				}								
			}else if(sch_autojob[mpos].MODE == 2){			
				if(!(mpos in sch_autoloadmark))sch_autoloadmark[mpos]=0;
				if(sch_autoloadmark[mpos]==1){
					if(sch_autojob[mpos].stid != null)clearTimeout(sch_autojob[mpos].stid);//clear  on/off command 
					sch_autojob[mpos].schobj.cancel();//cancel schdule time active
					sch_autoloadmark[mpos]=0;
					console.log(">>9["+mpos+"]auto sch active ="+sch_autoloadmark[mpos]);				
				}				
			}else if(sch_autojob[mpos].MODE == 3){			
				if(!(mpos in sch_autoloadmark))sch_autoloadmark[mpos]=0;
				if(sch_autoloadmark[mpos]==1){	
					if(sch_autojob[mpos].stid != null)clearTimeout(sch_autojob[mpos].stid);//clear  on/off command 	
					sch_autoloadmark[mpos]=0;
					console.log(">>9["+mpos+"]auto runloop active ="+sch_autoloadmark[mpos]);		
				}
			}

		}
	}
});

function scanstart_comm(timearr,stval){
    let chkval = stval
    //let setval = 0
	if(timearr.length == 0)return [0,0,0];	
	if(!("ont" in timearr[0]))return [0,0,0];	
	
    for(tt in timearr){
        if(chkval >= timearr[tt].ont){
            chkval = chkval - timearr[tt].ont
        }else{
            chkval = timearr[tt].ont - chkval
            return [tt,"ont",chkval];
        }
        
        if(chkval >= timearr[tt].offt){
            chkval = chkval - timearr[tt].offt
        }else{
            chkval = timearr[tt].offt - chkval
            return [tt,"offt",chkval];
        }
    }
}

function device_auto_client(devlist,devcmd){
	let cmdindex = pdbuffer.pdjobj.subcmd[devcmd]
	console.log(">>auto_Client ="+JSON.stringify(devlist)+"for "+devcmd+" = "+cmdindex);
	for(kk in devlist){
		console.log("1>>auto_Client ="+JSON.stringify(devlist)+"for "+devcmd+" = "+cmdindex+" = "+kk+" time="+Date());
		dpos = devlist[kk].POS;
		dtype = devlist[kk].CMD;
		dregadd = devlist[kk].STU.substr(0,2);
		dstu = devlist[kk].STU.substr(0,2);
		dgroup = devlist[kk].GROUP;
		console.log("2>>auto_Client pos="+dpos+" cmd="+dtype+" add= "+dregadd+" time="+Date());
		chkss = device_chek_stu(dpos,dtype,dregadd);
		console.log("4>>auto_Client pos="+dpos+" cmd="+dtype+" add= "+dregadd+" time="+Date());
		console.log(">>check =>"+cmdindex+" for "+chkss);
		//if(cmdindex != chkss){	//check the active command is working to device now?
			//client command 			
			console.log("3>>auto_Client ="+JSON.stringify(devlist)+"for "+devcmd+" = "+cmdindex+" = "+kk+" time="+Date());
			runloopactiveurl = "http://127.0.0.1:3000/"+dtype+'?UUID='+pdbuffer.setuuid+"&POS="+dpos+"&Action="+devcmd+"&STU="+dstu+"0000"+"&GROUP="+dgroup
			console.log(">>runloop and auto  client active send to =>"+runloopactiveurl);
			client.get(runloopactiveurl, function (data, response) {
				console.log("keypad client active  ok ...");
			}).on("error", function(err) {console.log("err for client");});
		//}
	}
}


function settimeobj(akey){
	let swk=""
	for(ii in sch_autojob[akey].goweek)swk=swk+sch_autojob[akey].goweek[ii]+",";
	rulest = "1 "+sch_autojob[akey].gotime.substr(2,2)+" "+sch_autojob[akey].gotime.substr(0,2)+" * * "+swk.substr(0,swk.length-1)
	//rulest = "1 */2 * * * 0,1,2,3,4,5,6"
	console.log("["+akey+"]="+rulest);
	sch_autojob[akey].schobj =  schedule.scheduleJob( rulest , function(){
		console.log('>>>scheduleCronstyle xx:step ' + new Date());    
		if(sch_autojob[akey].stid != null)clearTimeout(sch_autojob[akey].stid);
		console.log('>>>'+akey);
		sch_autojob[akey].loopcnt=-1;
		sch_autojob[akey].stid = setTimeout(function(){ f3run(akey,"on")},1000);
		
	}); 
	sch_autoloadmark[akey]=1;//auto load to times schedule mark flag 0:no 1:load 
}

function setschobj(akey){
	let swk=""
	for(ii in sch_autojob[akey].goweek)swk=swk+sch_autojob[akey].goweek[ii]+",";
	rulest = " 1 "+sch_autojob[akey].gotime.substr(2,2)+" "+sch_autojob[akey].gotime.substr(0,2)+" * * "+swk.substr(0,swk.length-1)
	//rulest = "1 */2 * * * 0,1,2,3,4,5,6"
	console.log("["+akey+"]="+rulest);
	sch_autojob[akey].schobj =  schedule.scheduleJob( rulest , function(){
		console.log('>>>scheduleCronstyle xx:step ' + new Date());    
		if(sch_autojob[akey].stid != null)clearTimeout(sch_autojob[akey].stid);
		console.log('>>>'+akey);
		sch_autojob[akey].loopcnt=-1;
		sch_autojob[akey].stid = setTimeout(function(){ f3run(akey,"on")},1000);
		
	    //sch_autoloadmark[akey]=1;//auto load to times schedule mark flag 0:no 1:load 
	}); 
	
	
	//sch_autoloadmark[akey]=1;//auto load to times schedule mark flag 0:no 1:load 
	
	dd = new Date()
	strunmin = dd.getHours()*60 + dd.getMinutes()
	console.log("today_start time = "+ strunmin);
	let stinx =0
	let stcmd = "ont"
	let stval =0

	rlist = scanstart_comm(sch_autojob[akey].loop,strunmin);
	stinx = rlist[0]
	stcmd = rlist[1]
	stval = rlist[2]
	
	//console.log('>>>schedule Cronstyle xx:step ' + new Date());  
	console.log('>>>'+akey+" loop="+JSON.stringify(sch_autojob[akey].loop));
	
	if(stcmd == "ont"){		
		device_auto_client(sch_autojob[akey].devpos,"ON")  
		if(sch_autojob[akey].stid != null)clearTimeout(sch_autojob[akey].stid);
		
		sch_autojob[akey].loopcnt=stinx;
		sch_autojob[akey].stid = setTimeout(function(){ f3run(akey,"off")},stval*60*1000);//next command   
		console.log('1>>>'+akey+" stcmd="+stcmd+" stval="+stval+" loopinx="+stinx);
		
	}else if(stcmd == "offt"){				
		device_auto_client(sch_autojob[akey].devpos,"OFF")
		if(sch_autojob[akey].stid != null)clearTimeout(sch_autojob[akey].stid);
		
		sch_autojob[akey].loopcnt=stinx;
		sch_autojob[akey].stid = setTimeout(function(){ f3run(akey,"on")},stval*60*000);//next command  
		console.log('2>>>'+akey+" stcmd="+stcmd+" stval="+stval+" loopinx="+stinx);
	}
	
	sch_autoloadmark[akey]=1;//auto load to times schedule mark flag 0:no 1:load 
}

function setrunobj(akey){//startup RUNLOOP
	if(sch_autojob[akey].stid != null)clearTimeout(sch_autojob[akey].stid);//stop and delete  old data 
	//sch_autojob[akey].loopcnt=-1;
	sch_autojob[akey].stid = setTimeout(function(){f3run(akey,"load")},1000); //start event load 
	sch_autoloadmark[akey]=1;//auto load to times schedule mark flag 0:no 1:load 
}

function device_chek_stu(dpos,dtype,dregadd){//"EPOS": [{"POS":"E002","CMD":"PUMP","STU":"00","GROUP":"00"}]
	
	if(!(dpos in pdbuffer.pdjobj.PDDATA.Devtab))return 0;
	dtypecode = pdbuffer.pdjobj.CMDDATA[dtype][0]
	
	let devstatus = pdbuffer.pdjobj.PDDATA.Devtab[dpos][dtypecode]["chtab"][dregadd].sub;	
	return  devstatus;	
}

function device_load_client(devlist,devcmd){
	let dpos = ""
	let dtype = ""
	let dregadd = ""
	//let dstu = ""
	let dgroup = ""
	for(kk in devlist){
		dpos = devlist[kk].POS;
		dtype = devlist[kk].CMD;
		dregadd = devlist[kk].STU.substr(0,2);
		//dstu = devlist[kk].STU.substr(0,2);
		dgroup = "00";
		//client command 			
		loadloopactiveurl = "http://127.0.0.1:3000/"+dtype+'?UUID='+pdbuffer.setuuid+"&POS="+dpos+"&Action="+devcmd+"&STU="+dregadd+"0000"+"&GROUP="+dgroup
		console.log(">>runloop and auto  client active send to =>"+loadloopactiveurl);
		client.get(loadloopactiveurl, function (data, response) {
			console.log("sensor load client   ok ...");
		}).on("error", function(err) {console.log("err for client");});
	}

}

// auto status = 0x00: auto off , 0x01:auto on ,0x10:buffer active by schedule  
//=== ON/OFF fucnction list ======
function f3run(akey,cmd){
    console.log("["+akey+"] cmd="+cmd);

    switch(akey){
        case "GROWLED":
            if(cmd == "on"){
                sch_autojob[akey].loopcnt++;
                if( sch_autojob[akey].loopcnt >=  sch_autojob[akey].loop.length)sch_autojob[akey].loopcnt=0;
				console.log("["+akey+"] devon="+JSON.stringify(sch_autojob[akey].devpos));
				device_auto_client(sch_autojob[akey].devpos,"ON")
				
				sch_autojob.GROWLED.stid = setTimeout(function(){f3run("GROWLED","off")},sch_autojob[akey].loop[sch_autojob[akey].loopcnt].ont*60*1000); 
            }
            if(cmd == "off"){ 
				console.log("["+akey+"] devoff="+JSON.stringify(sch_autojob[akey].devpos)); 
				device_auto_client(sch_autojob[akey].devpos,"OFF")
				sch_autojob.GROWLED.stid = setTimeout(function(){f3run("GROWLED","on")},sch_autojob[akey].loop[sch_autojob[akey].loopcnt].offt*60*1000);         
            }
            break;
        case "CYCLEFAN":
            if(cmd == "on"){
                sch_autojob[akey].loopcnt++;
                if( sch_autojob[akey].loopcnt >=  sch_autojob[akey].loop.length)sch_autojob[akey].loopcnt=0;
				console.log(">>["+akey+"] devon="+JSON.stringify(sch_autojob[akey].devpos)+" loopcnt="+sch_autojob[akey].loopcnt);
				device_auto_client(sch_autojob[akey].devpos,"ON")
				sch_autojob.CYCLEFAN.stid = setTimeout(function(){f3run("CYCLEFAN","off")},sch_autojob[akey].loop[sch_autojob[akey].loopcnt].ont*60*1000); 
            }
            if(cmd == "off"){    
                //if( sch_autojob[akey].loopcnt >=  sch_autojob[akey].loop.length)sch_autojob[akey].loopcnt=0;
				console.log(">>["+akey+"] devoff="+JSON.stringify(sch_autojob[akey].devpos)+" loopcnt="+sch_autojob[akey].loopcnt); 
				device_auto_client(sch_autojob[akey].devpos,"OFF")				
				console.log(">>["+akey+"] devofft="+sch_autojob[akey].loop[sch_autojob[akey].loopcnt].offt+" loopcnt="+sch_autojob[akey].loopcnt); 
				sch_autojob.CYCLEFAN.stid = setTimeout(function(){f3run("CYCLEFAN","on")},sch_autojob[akey].loop[sch_autojob[akey].loopcnt].offt*60*1000);      
            }
            break;
        case "SPRAY":
            if(cmd == "on"){
                sch_autojob[akey].loopcnt++;
                if( sch_autojob[akey].loopcnt >=  sch_autojob[akey].loop.length)sch_autojob[akey].loopcnt=0;
				console.log("["+akey+"] devon="+JSON.stringify(sch_autojob[akey].devpos));
				device_auto_client(sch_autojob[akey].devpos,"ON")
				sch_autojob.SPRAY.stid = setTimeout(function(){f3run("SPRAY","off")},sch_autojob[akey].loop[sch_autojob[akey].loopcnt].ont*60*1000); 
            }
            if(cmd == "off"){   
				console.log("["+akey+"] devoff="+JSON.stringify(sch_autojob[akey].devpos)); 
				device_auto_client(sch_autojob[akey].devpos,"OFF")
				sch_autojob.SPRAY.stid = setTimeout(function(){f3run("SPRAY","on")},sch_autojob[akey].loop[sch_autojob[akey].loopcnt].offt*60*1000);           
            }
            break;
        case "REFRESH":
            if(cmd == "on"){
                sch_autojob[akey].loopcnt++;
                if( sch_autojob[akey].loopcnt >=  sch_autojob[akey].loop.length)sch_autojob[akey].loopcnt=0;
				console.log(">>["+akey+"] devon="+JSON.stringify(sch_autojob[akey].devpos)+" loopcnt="+sch_autojob[akey].loopcnt);
				device_auto_client(sch_autojob[akey].devpos,"ON")
				sch_autojob.REFRESH.stid = setTimeout(function(){f3run("REFRESH","off")},sch_autojob[akey].loop[sch_autojob[akey].loopcnt].ont*60*1000); 
            }
            if(cmd == "off"){   
                //if( sch_autojob[akey].loopcnt >=  sch_autojob[akey].loop.length)sch_autojob[akey].loopcnt=0;
				console.log(">>["+akey+"] devoff="+JSON.stringify(sch_autojob[akey].devpos)+" loopcnt="+sch_autojob[akey].loopcnt); 
				device_auto_client(sch_autojob[akey].devpos,"OFF");
				console.log(">>["+akey+"] devofft="+sch_autojob[akey].loop[sch_autojob[akey].loopcnt].offt+" loopcnt="+sch_autojob[akey].loopcnt); 
				
				sch_autojob.REFRESH.stid = setTimeout(function(){f3run("REFRESH","on")},sch_autojob[akey].loop[sch_autojob[akey].loopcnt].offt*60*1000);       
            }
            break;
        case "UV":
            if(cmd == "on"){
                sch_autojob[akey].loopcnt++;
                if( sch_autojob[akey].loopcnt >=  sch_autojob[akey].loop.length)sch_autojob[akey].loopcnt=0;
				console.log("["+akey+"] devon="+JSON.stringify(sch_autojob[akey].devpos));
				device_auto_client(sch_autojob[akey].devpos,"ON")
				sch_autojob.UV.stid = setTimeout(function(){f3run("UV","off")},sch_autojob[akey].loop[sch_autojob[akey].loopcnt].ont*60*1000); 
            }
            if(cmd == "off"){ 
				console.log("["+akey+"] devoff="+JSON.stringify(sch_autojob[akey].devpos)); 
				device_auto_client(sch_autojob[akey].devpos,"OFF")
				sch_autojob.UV.stid = setTimeout(function(){f3run("UV","on")},sch_autojob[akey].loop[sch_autojob[akey].loopcnt].offt*60*1000);          
            }
            break;
        case "PUMP":
            if(cmd == "on"){
                sch_autojob[akey].loopcnt++;
                if( sch_autojob[akey].loopcnt >=  sch_autojob[akey].loop.length)sch_autojob[akey].loopcnt=0;
				console.log("["+akey+"] devon="+JSON.stringify(sch_autojob[akey].devpos));
				device_auto_client(sch_autojob[akey].devpos,"ON")
				
				sch_autojob.PUMP.stid = setTimeout(function(){f3run("PUMP","off")},sch_autojob[akey].loop[sch_autojob[akey].loopcnt].ont*60*1000); 
            }
            if(cmd == "off"){   
				console.log("["+akey+"] devoff="+JSON.stringify(sch_autojob[akey].devpos)); 
				device_auto_client(sch_autojob[akey].devpos,"OFF")
				sch_autojob.PUMP.stid = setTimeout(function(){f3run("PUMP","on")},sch_autojob[akey].loop[sch_autojob[akey].loopcnt].offt*60*1000);          
            }
            break;
        case "GROWUPDOWN":
            if(cmd == "on"){
                sch_autojob[akey].loopcnt++;
                if( sch_autojob[akey].loopcnt >=  sch_autojob[akey].loop.length)sch_autojob[akey].loopcnt=0;
				console.log("["+akey+"] devon="+JSON.stringify(sch_autojob[akey].devpos));
				device_auto_client(sch_autojob[akey].devpos,"ON")
				sch_autojob.GROWUPDOWN.stid = setTimeout(function(){f3run("GROWUPDOWN","off")},sch_autojob[akey].loop[sch_autojob[akey].loopcnt].ont*60*1000); 
            }
            if(cmd == "off"){   
				console.log("["+akey+"] devoff="+JSON.stringify(sch_autojob[akey].devpos)); 
				device_auto_client(sch_autojob[akey].devpos,"OFF")
				sch_autojob.GROWUPDOWN.stid = setTimeout(function(){f3run("GROWUPDOWN","on")},sch_autojob[akey].loop[sch_autojob[akey].loopcnt].offt*60*1000);          
            }
            break;
        case "AIRCON":
            if(cmd == "load"){
				console.log("["+akey+"] sensorpos="+JSON.stringify(sch_autojob[akey].sensorpos));
				console.log("["+akey+"] outsensorpos="+JSON.stringify(sch_autojob[akey].outsensorpos));
				device_load_client(sch_autojob[akey].sensorpos,"LOAD");
				device_load_client(sch_autojob[akey].outsensorpos,"LOAD");
				sch_autojob.AIRCON.stid = setTimeout(function(){f3run("AIRCON","check")},sch_autojob[akey].loop[0].checkt*60*1000); 
			}
            if(cmd == "check"){				
				let chkval = jobjcopy( loadstudata(akey));//clear checek value buffer
				let ochkval = jobjcopy(loadoutstudata(akey));
				
				console.log("all airtm=>"+JSON.stringify(chkval)+" chkhigh="+sch_autojob[akey].chkhigh +" chklow="+ sch_autojob[akey].chklow )
				//=== RUNLOOP check Login  =======
				if( chkval.vmax > 0){
					if(chkval.vmax >= sch_autojob[akey].chkhigh){
						sch_autojob.AIRCON.stid = setTimeout(function(){f3run("AIRCON","on")},sch_autojob[akey].loop[0].ont*60*1000); 
						console.log("1>> goto tm on")
					}else if(chkval.vmax <= sch_autojob[akey].chklow){
						sch_autojob.AIRCON.stid = setTimeout(function(){f3run("AIRCON","on")},sch_autojob[akey].loop[0].ont*60*1000);	
						console.log("2>> goto tm on")						
					}else{
						sch_autojob.AIRCON.stid = setTimeout(function(){f3run("AIRCON","off")},sch_autojob[akey].loop[0].offt*60*1000);
						console.log("3>> goto tm off")							
					}
				}else{
					sch_autojob.AIRCON.stid = setTimeout(function(){f3run("AIRCON","load")},sch_autojob[akey].loop[0].loadt*60*1000); 
					console.log("4>> goto tm load")							
				}
			}
            if(cmd == "off"){
				console.log("["+akey+"] devoff="+JSON.stringify(sch_autojob[akey].devpos)); //"EPOS": [{"POS":"A001","CMD":"PUMP","GROUP":0}]
				device_auto_client(sch_autojob[akey].devpos,"OFF")
				sch_autojob.AIRCON.stid = setTimeout(function(){f3run("AIRCON","load")},sch_autojob[akey].loop[sch_autojob[akey].loopcnt].loadt*60*1000);
				console.log(">> goto tm load")
			}
            if(cmd == "on"){
				console.log("["+akey+"] devon="+JSON.stringify(sch_autojob[akey].devpos)); 
				device_auto_client(sch_autojob[akey].devpos,"ON")
				sch_autojob.AIRCON.stid = setTimeout(function(){f3run("AIRCON","load")},sch_autojob[akey].loop[sch_autojob[akey].loopcnt].loadt*60*1000);
				console.log(">> goto tm load")
			}
            break;
        case "AIRRH":
            if(cmd == "load"){
				console.log("["+akey+"] sensorpos="+JSON.stringify(sch_autojob[akey].sensorpos));
				console.log("["+akey+"] outsensorpos="+JSON.stringify(sch_autojob[akey].outsensorpos));
				device_load_client(sch_autojob[akey].sensorpos,"LOAD");
				device_load_client(sch_autojob[akey].outsensorpos,"LOAD");
				sch_autojob.AIRRH.stid = setTimeout(function(){f3run("AIRRH","check")},sch_autojob[akey].loop[0].checkt*60*1000); 
			}
            if(cmd == "check"){
				let chkval = jobjcopy( loadstudata(akey));//clear checek value buffer
				let ochkval = jobjcopy(loadoutstudata(akey));
				
				console.log("all airrrh=>"+JSON.stringify(chkval)+" chkhigh"+sch_autojob[akey].chkhigh +" chklow="+ sch_autojob[akey].chklow )
				//=== RUNLOOP check Login  =======
				if( chkval.vmax > 0){
					if(chkval.vmax >= sch_autojob[akey].chkhigh){
						sch_autojob.AIRRH.stid = setTimeout(function(){f3run("AIRRH","on")},sch_autojob[akey].loop[0].ont*60*1000); 
						console.log(">> goto rh on")
					}else if(chkval.vmax <= sch_autojob[akey].chklow){
						sch_autojob.AIRRH.stid = setTimeout(function(){f3run("AIRRH","on")},sch_autojob[akey].loop[0].ont*60*1000);	
						console.log(">> goto rh on")						
					}else{
						sch_autojob.AIRRH.stid = setTimeout(function(){f3run("AIRRH","off")},sch_autojob[akey].loop[0].offt*60*1000);
						console.log(">> goto rh off")							
					}
				}else{
					sch_autojob.AIRRH.stid = setTimeout(function(){f3run("AIRRH","load")},sch_autojob[akey].loop[0].loadt*60*1000); 
					console.log(">> goto rh load")							
				}
				
			}
            if(cmd == "off"){
				console.log("["+akey+"] devoff="+JSON.stringify(sch_autojob[akey].devpos)); 
				device_auto_client(sch_autojob[akey].devpos,"OFF")
				sch_autojob.AIRRH.stid = setTimeout(function(){f3run("AIRRH","load")},sch_autojob[akey].loop[0].loadt*60*1000); 
				console.log(">> goto rh load")							
			}
            if(cmd == "on"){
				console.log("["+akey+"] devon="+JSON.stringify(sch_autojob[akey].devpos)); 
				device_auto_client(sch_autojob[akey].devpos,"ON")
				sch_autojob.AIRRH.stid = setTimeout(function(){f3run("AIRRH","load")},sch_autojob[akey].loop[0].loadt*60*1000); 
				console.log(">> goto rh load")							
			}
            break;
        case "WATERTM":
		
            break;
        case "CO2":
            if(cmd == "load"){
				console.log("["+akey+"] sensorpos="+JSON.stringify(sch_autojob[akey].sensorpos));
				console.log("["+akey+"] outsensorpos="+JSON.stringify(sch_autojob[akey].outsensorpos));
				device_load_client(sch_autojob[akey].sensorpos,"LOAD");
				device_load_client(sch_autojob[akey].outsensorpos,"LOAD");
				sch_autojob.CO2.stid = setTimeout(function(){f3run("CO2","check")},sch_autojob[akey].loop[0].checkt*60*1000); 
			}
            if(cmd == "check"){				
				let chkval = jobjcopy( loadstudata(akey));//clear checek value buffer
				let ochkval = jobjcopy(loadoutstudata(akey));
				
				console.log("all airco2=>"+JSON.stringify(chkval)+" chkhigh"+sch_autojob[akey].chkhigh +" chklow="+ sch_autojob[akey].chklow )
				//=== RUNLOOP check Login  =======
				if( chkval.vmax > 0){
					if(chkval.vmax >= sch_autojob[akey].chkhigh){
						sch_autojob.CO2.stid = setTimeout(function(){f3run("CO2","on")},sch_autojob[akey].loop[0].ont*60*1000); 
						console.log(">> goto co2 on")
					}else if(chkval.vmax <= sch_autojob[akey].chklow){
						sch_autojob.CO2.stid = setTimeout(function(){f3run("CO2","on")},sch_autojob[akey].loop[0].ont*60*1000);	
						console.log(">> goto co2 on")						
					}else{
						sch_autojob.CO2.stid = setTimeout(function(){f3run("CO2","off")},sch_autojob[akey].loop[0].offt*60*1000);
						console.log(">> goto co2 off")							
					}
				}else{
					sch_autojob.CO2.stid = setTimeout(function(){f3run("CO2","load")},sch_autojob[akey].loop[0].loadt*60*1000); 
					console.log(">> goto co2 load")							
				}
				
			}
            if(cmd == "off"){
				console.log("["+akey+"] devoff="+JSON.stringify(sch_autojob[akey].devpos));  
				device_auto_client(sch_autojob[akey].devpos,"OFF")				
				sch_autojob.CO2.stid = setTimeout(function(){f3run("CO2","load")},sch_autojob[akey].loop[0].loadt*60*1000); 
				console.log(">> goto co2 load")		
			}
            if(cmd == "on"){
				console.log("["+akey+"] devon="+JSON.stringify(sch_autojob[akey].devpos));
				device_auto_client(sch_autojob[akey].devpos,"ON")
				sch_autojob.CO2.stid = setTimeout(function(){f3run("CO2","load")},sch_autojob[akey].loop[0].loadt*60*1000); 
				console.log(">> goto co2 load")			
			}
            break;
        case "OPWAVE":
            break;
        case "DOSE":
            break;
        default:
            return 	
    }	
}

function loadstudata(akey){
	let rhchkval = [];//clear checek value buffer
	let ksspos = "";
	let typecmd = "";
	let typedevreg = "";
	let loadval = 0;
	let vobj = {"vmax" :0 , "vmin": 0};
	for(kss in  sch_autojob[akey].sensorpos){
		ksspos = sch_autojob[akey].sensorpos[kss].POS
		kssfuncmd = sch_autojob[akey].sensorpos[kss].CMD
		console.log(">>index="+kss+">>pos="+ksspos+">>CMDDATA="+sch_autojob[akey].type)
		if(ksspos in pdbuffer.pdjobj.PDDATA.Devtab){
			//typecmd = pdbuffer.pdjobj.CMDDATA[sch_autojob[akey].type][0]
			typecmd = pdbuffer.pdjobj.CMDDATA[kssfuncmd][0]
			typedevreg = sch_autojob[akey].sensorpos[kss].STU.substr(0,2) //v2 device 
			//console.log(">>index="+kss+">>pos="+ksspos+">>"+typecmd)
			loadval = pdbuffer.pdjobj.PDDATA.Devtab[ksspos][typecmd]["chtab"][typedevreg].stu;
			if(loadval > 0)rhchkval.push(loadval);
		}
	}
	if(rhchkval.length > 0){
		vobj.vmax = Math.max.apply(null, rhchkval);
		vobj.vmin = Math.min.apply(null, rhchkval);
	}else{
		vobj.vmax = 0;
		vobj.vmin = 0;
	}
	return vobj;
	
	//return rhchkval;
}

function loadoutstudata(akey){
	let outrhchkval=[];//clear checek value buffer
	let outksspos = "";
	let typecmd = "";
	let typedevreg = "";
	let oloadval = 0;
	let vobj = {"vmax" :0 , "vmin": 0};
	for(outkss in  sch_autojob[akey].outsensorpos){
		outksspos = sch_autojob[akey].outsensorpos[outkss].POS
		outkssfuncmd = sch_autojob[akey].outsensorpos[outkss].CMD
		
		//console.log(">>index="+outkss+">>pos="+outksspos)
		if(outksspos in pdbuffer.pdjobj.PDDATA.Devtab){
			//typecmd = pdbuffer.pdjobj.CMDDATA[sch_autojob[akey].type][0]
			typecmd = pdbuffer.pdjobj.CMDDATA[outkssfuncmd][0]
			typedevreg = sch_autojob[akey].sensorpos[kss].STU.substr(0,2) //v2 device 
			//console.log(">>index="+outkss+">>pos="+outksspos+">>"+typecmd)
			oloadval = pdbuffer.pdjobj.PDDATA.Devtab[outksspos][typecmd]["chtab"][typedevreg].stu;
			if(oloadval > 0)outrhchkval.push(oloadval);
		}
	}
	if(outrhchkval.length > 0){
		vobj.vmax = Math.max.apply(null, outrhchkval);
		vobj.vmin = Math.min.apply(null, outrhchkval);
	}else{
		vobj.vmax = 0;
		vobj.vmin = 0;
	}
	return vobj;
	//return outrhchkval;
}

//=== auto time schedule funcion ======
var sch_autojob={}
var sch_autoloadmark={}//排程載入flag 0:未載入 1:已載入

var jobitem = { 
		"gotime":0,
		"goweek":[0,1,2,3,4,5,6],
		"schobj":0,stid:null,
		"loop":[{"ont":5,"offt":5}],
		"time":[{"stt":"0001","endt":"0900"}],
		"loop":[{"ont":5,"offt":5}],
		"loopcnt":0 ,
		"devpos":[] 
	};
var timeloopitem = {"ont":5,"offt":5};
var timetrgitem = {"stt":"0001","endt":"0900"};

var runjobitem = {
		
		"schobj":0,stid:null,
		"loop":[{"ont":1,"offt":1,"loadt":1,"checkt":1}],
		"loopcnt":0 ,
		
		"devpos":[],
		"sensorpos":[],
		"outsensorpos":[],
		"limlow":0,
		"limhigh":0,
		"chklow":0,
		"chkhigh":0,
		"type":"TEMPERATURE"
	}

	
//MODE =0 NC pass , 1: TIMER , 2:SCHEDULE , 3:RUNLOOP 
function load_autojob(akey,jautodata){
	let timeitem =  {"ont":5,"offt":5};
	console.log(">>"+JSON.stringify(jautodata));
	if( jautodata.MODE == 1){//TIMER
		if(!("TIMER" in jautodata))return;
		if(!(akey in sch_autojob))sch_autojob[akey]={}
		sch_autojob[akey]= jobjcopy(jobitem);
		
		sch_autojob[akey].MODE = 1 //jautodata.MODE;
		sch_autojob[akey].STATU = jautodata.STATU;	
		sch_autojob[akey].SENSOR_CONTROL = jautodata.SENSOR_CONTROL;
		
		sch_autojob[akey].gotime = jautodata.TIMER.ST
		sch_autojob[akey].goweek = [0,1,2,3,4,5,6]
		sch_autojob[akey].loop = []
		
		timeitem.ont = Number(jautodata.TIMER.ON.substr(0,2))*60+Number(jautodata.TIMER.ON.substr(2,2))
		timeitem.offt = Number(jautodata.TIMER.OFF.substr(0,2))*60+Number(jautodata.TIMER.OFF.substr(2,2))
		sch_autojob[akey].loop[0]= jobjcopy(timeitem);
		sch_autojob[akey].loopcnt = 0
		sch_autojob[akey].devpos = jobjcopy(jautodata.TIMER.EPOS);
		// if(sch_autojob[akey].STATU == 1){
			// setschobj(akey);
		// }
		sch_autoloadmark[akey]=0;//auto load to times schedule mark flag 0:no 1:load 
		console.log("load ["+akey+"]="+JSON.stringify(sch_autojob[akey]));		
	}else if(jautodata.MODE == 2){//SCHEDULE
		if(!("SCHEDULE" in jautodata))return;
		if(!(akey in sch_autojob))sch_autojob[akey]={}	
		sch_autojob[akey]= jobjcopy(jobitem);
		
		sch_autojob[akey].MODE = 2 //jautodata.MODE;
		sch_autojob[akey].STATU = jautodata.STATU;			
		sch_autojob[akey].SENSOR_CONTROL = jautodata.SENSOR_CONTROL;	
		
		sch_autojob[akey].gotime = "0001";
		//sch_autojob[akey].goweek = [0,1,2,3,4,5,6];//Number('0x'+cstu)
		sch_autojob[akey].goweek = [];
		//nwk=Number('0x'+jautodata.SCHEDULE.WEEK.substr(0,2));
		//if(nwk & 0x01)sch_autojob[akey].goweek.push(0);
		//if(nwk & 0x02)sch_autojob[akey].goweek.push(1);
		//if(nwk & 0x04)sch_autojob[akey].goweek.push(2);
		//if(nwk & 0x08)sch_autojob[akey].goweek.push(3);
		//if(nwk & 0x10)sch_autojob[akey].goweek.push(4);
		//if(nwk & 0x20)sch_autojob[akey].goweek.push(5);
		//if(nwk & 0x40)sch_autojob[akey].goweek.push(6);	
		//WEEK = "01111111" [][6][5][4][3][2][1][0]
		chm6 = jautodata.SCHEDULE.WEEK.substr(1,1);	
		chm5 = jautodata.SCHEDULE.WEEK.substr(2,1);	
		chm4 = jautodata.SCHEDULE.WEEK.substr(3,1);	
		chm3 = jautodata.SCHEDULE.WEEK.substr(4,1);	
		chm2 = jautodata.SCHEDULE.WEEK.substr(5,1);	
		chm1 = jautodata.SCHEDULE.WEEK.substr(6,1);	
		chm0 = jautodata.SCHEDULE.WEEK.substr(7,1);	
		if(chm0 == '1')sch_autojob[akey].goweek.push(0);
		if(chm1 == '1')sch_autojob[akey].goweek.push(1);
		if(chm2 == '1')sch_autojob[akey].goweek.push(2);
		if(chm3 == '1')sch_autojob[akey].goweek.push(3);
		if(chm4 == '1')sch_autojob[akey].goweek.push(4);
		if(chm5 == '1')sch_autojob[akey].goweek.push(5);
		if(chm6 == '1')sch_autojob[akey].goweek.push(6);	
		
		sch_autojob[akey].devpos = jobjcopy(jautodata.SCHEDULE.EPOS);
				
		//=== setup the schedule to time loop ====
		let simst_time = 0;
		let simend_time = 23*60+59;//by min count
		let xston = 0;
		let xstoff = 0;
		let simoutitem = {"ont":0,"offt":0};		
		sch_autojob[akey].loop = []
		
		for(ii in jautodata.SCHEDULE.ONLOOP){
			jsttt = jautodata.SCHEDULE.ONLOOP[ii];
			console.log("["+ii+"]>>"+jsttt);
			xston = Number(jsttt.substr(0,2))*60+ Number(jsttt.substr(2,2));
			xstoff = Number(jsttt.substr(4,2))*60+ Number(jsttt.substr(6,2));

			if(ii == 0 ){
				simoutitem.ont  = 0;
				simoutitem.offt = xston - simst_time;
				sch_autojob[akey].loop.push(jobjcopy(simoutitem));//###
				if(xstoff > xston ){
					simoutitem.ont  =  xstoff - xston ;

				}else{            
					simoutitem.ont  =  0;
				}
				simoutitem.offt = xstoff;
			}else if(ii == jautodata.SCHEDULE.ONLOOP.length-1){        
				if( xston > simoutitem.offt ){
					simoutitem.offt  =  xston - simoutitem.offt ;
				}else{            
					simoutitem.offt  = 1;
				}        
				sch_autojob[akey].loop.push(jobjcopy(simoutitem));//###
				
				if(xstoff > xston ){
					simoutitem.ont  =  xstoff - xston ;

				}else{            
					simoutitem.ont  =  0;
				}
				simoutitem.offt = simend_time - xstoff;
				sch_autojob[akey].loop.push(jobjcopy(simoutitem));//###

			}else{
				
				if( xston > simoutitem.offt ){
					simoutitem.offt  =  xston - simoutitem.offt ;
				}else{            
					simoutitem.offt  = 1;
				}        
				sch_autojob[akey].loop.push(jobjcopy(simoutitem));//###
				
				if(xstoff > xston ){
					simoutitem.ont  =  xstoff - xston ;

				}else{            
					simoutitem.ont  =  0;
				}
				simoutitem.offt = xstoff;
			}			
		}
		
		
		// for(ii in jautodata.SCHEDULE.ONLOOP){
			// timeitem.ont= jautodata.SCHEDULE.ONLOOP[ii].substr(0,4);
			// timeitem.offt= jautodata.SCHEDULE.ONLOOP[ii].substr(4,4);
			// sch_autojob[akey].loop.push(jobjcopy(timeitem));
		// }		
		sch_autojob[akey].loopcnt = 0
		
		sch_autoloadmark[akey]=0;//auto load to times schedule mark flag 0:no 1:load 
		console.log("load ["+akey+"]="+JSON.stringify(sch_autojob[akey]));		
	}else if(jautodata.MODE == 3){//RUNLOOP
		if(!("RUNLOOP" in jautodata))return;
		if(!(akey in sch_autojob))sch_autojob[akey]={}	
		sch_autojob[akey]= jobjcopy(runjobitem);
		
		sch_autojob[akey].MODE = 3 //jautodata.MODE;
		sch_autojob[akey].STATU = jautodata.STATU;			
		sch_autojob[akey].SENSOR_CONTROL = jautodata.SENSOR_CONTROL;
		
		sch_autojob[akey].loop = [{"ont":1,"offt":1,"loadt":1,"checkt":1}]
		sch_autojob[akey].devpos = jobjcopy(jautodata.RUNLOOP.EPOS);
		sch_autojob[akey].sensorpos = jobjcopy(jautodata.RUNLOOP.SENSORPOS);		
		sch_autojob[akey].outsensorpos = jobjcopy(jautodata.RUNLOOP.OUTSENSORPOS);
		
		for(kk in jautodata.RUNLOOP){
			if(kk.indexOf('!') > 0 ){
				ll = kk.split("!");
				sch_autojob[akey].type = ll[0]
				console.log(">>akey="+akey+">>kk="+kk+">>type="+sch_autojob[akey].type);
				sch_autojob[akey].chklow  = Number(jautodata.RUNLOOP[kk].substr(0,4))
				sch_autojob[akey].chkhigh = Number(jautodata.RUNLOOP[kk].substr(4,4))
				console.log(">>chklow="+sch_autojob[akey].chklow+">>chkhigh="+sch_autojob[akey].chkhigh);
				if(sch_autojob[akey].type in pdbuffer.jautocmd.LIMITPAM){
					sch_autojob[akey].limlow = pdbuffer.jautocmd.LIMITPAM[sch_autojob[akey].type].limlow 	//jautodata.
					sch_autojob[akey].limhigh = pdbuffer.jautocmd.LIMITPAM[sch_autojob[akey].type].limhigh 	//jautodata.
				}else{
					sch_autojob[akey].limlow = 0 	//jautodata.
					sch_autojob[akey].limhigh = 0  	//jautodata.
				}
				console.log(">>limlow="+sch_autojob[akey].limlow+">>limhigh="+sch_autojob[akey].limhigh);
			}
		}		
	}
}

function reload_autojob(){
	for(jj in pdbuffer.jautocmd.DEVLIST){
		load_autojob(jj,pdbuffer.jautocmd.DEVLIST[jj]);
	}
	console.log("reload auto to buffer ok !");
}

//=== keypad AUTO POS active  === 
const kactivecode = {"OFF":0,"ON":1,"AUTO":2}
function autopushkeypad(kpos,kcode,kactive){
	let ttbuf = ""
	if(kpos == "KEYPAD0"){// KEYPAD0 active update to KEYPAD2 auto mode display LED cmdcode.r485subcmd[]
		ttbuf = Buffer.from(cmdcode.rs485v050.s11cmd,'hex'); //"[0][1:add][2:len][3][4:cmd][5:REG][6:keycode][7:status][10]"f5 00 06 00 03 12 12 34 11"	
		ttbuf[4]= 0x03;//set auto command display
		ttbuf[5]= 0x12;//for KEYPAD2 display
		switch(kcode){
			case "K001":
					if(!(kactive in pdbuffer.jkeypd.KEYLIB.KEYPAD2.K091.EVENT))return;
					ttbuf[6]= 0x91;
					ttbuf[7]= kactivecode[kactive];
					break;
			case "K002":
					return;
					break;
			case "K003":
					if(!(kactive in pdbuffer.jkeypd.KEYLIB.KEYPAD2.K093.EVENT))return;
					ttbuf[6]= 0x93;
					ttbuf[7]= kactivecode[kactive];
					break;
			case "K004":
					if(!(kactive in pdbuffer.jkeypd.KEYLIB.KEYPAD2.K094.EVENT))return;
					ttbuf[6]= 0x94;
					ttbuf[7]= kactivecode[kactive];
					break;
			case "K005":
					if(!(kactive in pdbuffer.jkeypd.KEYLIB.KEYPAD2.K094.EVENT))return;
					ttbuf[6]= 0x94;
					ttbuf[7]= kactivecode[kactive];
					break;
			default:
				return 	
		}
		
		pdbuffer.totxbuff(ttbuf);
	}
}

function active_keypadjob(kpos,kcode,kactive){
	console.log(">>"+kpos+">>"+kcode+">>"+kactive);
	if(!(kpos in pdbuffer.jkeypd.KEYLIB))return;
	if(!(kcode in pdbuffer.jkeypd.KEYLIB[kpos]))return;
	if(!(kactive in pdbuffer.jkeypd.KEYLIB[kpos][kcode].EVENT))return;
	let kjob = jobjcopy(pdbuffer.jkeypd.KEYLIB[kpos][kcode]["EVENT"][kactive]);
	let keyactiveurl = ""
	let run_cmd = ""
	let run_pos =""
	let run_active = ""
	let run_stu = ""
	let run_group = ""
	
	//http://tscloud.opcom.com/Cloud/API/v2/KeypadUpdate?ID=OFA1C0044826BEF87AEA0481&KeypadID=KEYPAD0&Index=K004&value=ON
	console.log(">>"+kactive+"="+JSON.stringify(kjob));
	for(cc in kjob){
		run_cmd = kjob[cc].CMD;
		run_pos = kjob[cc].POS;
		run_active = kjob[cc].Action;
		run_stu = kjob[cc].STU;
		run_group = kjob[cc].GROUP;
		
		//console.log(">>["+cc+"]"+run_cmd)
		keyactiveurl = "http://127.0.0.1:3000/"+run_cmd+'?UUID='+pdbuffer.setuuid+"&POS="+run_pos+"&Action="+run_active+"&STU="+run_stu+"&GROUP="+run_group
		console.log(">>keypad client active send to =>"+keyactiveurl);
		client.get(keyactiveurl, function (data, response) {
			console.log("keypad client active  ok ...");
		}).on("error", function(err) {console.log("err for client");});

		
	}
	
	pdbuffer.jkeypd.KEYLIB[kpos][kcode].STATUS.stpt = kactive;//active ok 	
			
//if(run_cmd == "REGCMD/KEYSETUP"){
	updatekeysstuatusurl= pdbuffer.pdjobj.PDDATA.v2keypadstatusupdateurl+"?ID="+pdbuffer.setuuid+"&KeypadID="+kpos+"&Index="+kcode+"&value="+kactive;
	console.log("sudo active update to webui =>"+updatekeysstuatusurl);
	client.get(updatekeysstuatusurl,cargs, function (data, response) {
		console.log("keypad active update to webui   ok ...");
	}).on("error", function(err) {console.log("err for client");}).on('requestTimeout', function (req) {req.abort();});

	//autopushkeypad(kpos,kcode,kactive);
}

function restart_keypadjob(kpos){//power on reactive all key status 
	if(!(kpos in pdbuffer.jkeypd.KEYLIB))return;
	let kcode =""
	let kactive =""
	for( kk in  pdbuffer.jkeypd.KEYLIB[kpos]){
		if(kk ==  "STATUS")continue;
		kcode = kk;
		kactive = pdbuffer.jkeypd.KEYLIB[kpos][kk].STATUS.stpt;
		active_keypadjob(kpos,kcode,kactive);
	}
}



exports.autoeventcall = autoeventcall

//=== autojob array fucnion and data ===
exports.sch_autojob = sch_autojob

exports.reload_autojob = reload_autojob
exports.load_autojob = load_autojob

//=== set time schedule funcion === 
exports.setschobj = setschobj

//=== keypad function call ===
exports.active_keypadjob = active_keypadjob
exports.restart_keypadjob = restart_keypadjob


