<script runat="server">
Platform.Load("Core", "1.1.5");

var responseJSON = {};
responseJSON.method = Platform.Request.Method;
responseJSON.rawBody = Platform.Request.GetPostData("UTF-8");

try {
  var body = Platform.Function.ParseJSON(responseJSON.rawBody);
  responseJSON.parsed = body;
  responseJSON.mode = body.mode;
  responseJSON.emailId = body.emailId;
  responseJSON.assetId = body.assetId;
  responseJSON.scheduledTime = body.scheduledTime;
  responseJSON.permissionType = body.permissionType;
  responseJSON.Betreff = body.Betreff;
  responseJSON.Preheader = body.Preheader;
  responseJSON.articlesJSON = body.articlesJSON;
} catch (e) {
  responseJSON.error = String(e);
}

//Write(Stringify(responseJSON));
</script>