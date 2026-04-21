
%%[
    SET @dev = true
]%%
<script type="text/javascript" runat="server">
    Platform.Load("Core", "1.1.5");

    // Init Response Object
    var responseJSON = {};
    // Access-control
    var ip = Platform.Request.ClientIP();
    var origin = Platform.Request.GetRequestHeader('Referer')
    // Comes from LandingPage 
    var dev = Variable.GetValue("@dev");
    // Add to Response Object
    responseJSON.ip = ip;
    responseJSON.origin = origin;
    responseJSON.dev =  dev;
    // Start Timer
    var timeJSON = {};
    timeJSON.start = new Date().getTime();
    responseJSON.version = '0.2';
    
    // Retrieve Data from Frontend and assign values to Response Object
    var jsonpost = Platform.Request.GetPostData();
    var json = Platform.Function.ParseJSON(jsonpost);

    var mode = json.mode; 
    responseJSON.mode = mode; 
    var getEmailId = json.emailId;
    responseJSON.getEmailId = getEmailId; 
    var getAssetId = json.assetId;
    responseJSON.getAssetId = getAssetId; 
    var sendTime = json.scheduledTime;
    responseJSON.sendTime = sendTime;
    Variable.SetValue('@sendTime',sendTime);
    var scheduledTime = json.scheduledTime;
    responseJSON.scheduledTime = scheduledTime;
    Variable.SetValue('@scheduledTime',scheduledTime);
    var permissionType = json.permissionType;
    responseJSON.permissionType = permissionType;
     
    
    //var brand = Platform.Function.Lookup("ENT.NewsletterTypes","brand","Id",newsletterPermission);
    //responseJSON.brand = brand;
    //var newsletterLogName = dev == false ? newsletterPermission : "DEV_" + newsletterPermission;
    //responseJSON.nlName = newsletterLogName;
    //Variable.SetValue('@newsletterName',newsletterName);
    // More Data from Frontend to help construct the Email
   
    var nlBetreff = json.Betreff;
    responseJSON.nlBetreff = nlBetreff;
    var nlPreHeader = json.Preheader;
    responseJSON.nlPreHeader = nlPreHeader;
  
    //artikel und dazugehörige categories
    var articlesJSON = json.articlesJSON;
    //remove backslashes
    //articlesJSON = articlesJSON.replace(/\\/g, '');
    responseJSON.articlesJSON = articlesJSON;
    //var NLMID = Platform.Function.Lookup("ENT.NewsletterTypes","MID","Id",newsletterPermission);
    //responseJSON.NLMID = NLMID;
</script>
%%[
    SET @timestamp = SystemDateToLocalDate(NOW())
    SET @schedDate = RequestParameter("scheduledTime")
    IF EMPTY(@schedDate) THEN
        SET @longTimestamp = properCase(FormatDate(@timestamp, "l", "", "de-DE"))
    ELSE
        SET @longTimestamp = properCase(FormatDate(@sendTime, "l", "", "de-DE"))
    ENDIF
    SET @shortTimestamp = FormatDate(@timestamp, "YYYY-MM-DD", "HH-MM-ss")
]%%
<script type="text/javascript" runat="server">
    Platform.Load("Core", "1.1.5");

    responseJSON.statusCode = 400;
    responseJSON.statusMessage = 'no action';
    var timestamp = Variable.GetValue("@timestamp");
    var longTimestamp = Variable.GetValue("@longTimestamp");
    var shortTimestamp = Variable.GetValue("@shortTimestamp");
    responseJSON.timestamp = timestamp;

   

    
/* } catch (e) {
    responseJSON.statusCode = '401';
    responseJSON.statusMessage = Stringify(e);
    //responseJSON.timings = timeJSON;
    //responseJSON.journeycheck = journeyResponse;

    Write(stringify(responseJSON));
    //var scriptLog = Platform.Function.InsertData("ScriptLog",["Date","Newsletter","mode","IP","Response"],[timestamp,newsletterLogName,mode,ip,Stringify(responseJSON)]);
  
    } */
</script>