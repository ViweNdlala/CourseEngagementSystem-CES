
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class PointsConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.roomGroupName = "points_notifications"
        await self.channel_layer.group_add(self.roomGroupName, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.roomGroupName, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        event_type = data.get("type")

        # Example: student sends a point request
        if event_type == "request_points":
            await self.channel_layer.group_send(
                self.roomGroupName,
                {
                    "type": "send_notification",
                    "event": "new_request",
                    "student": data["student"],
                    "points": data["points"],
                    "reason": data.get("reason", "")
                }
            )

    async def send_notification(self, event):
        await self.send(text_data=json.dumps(event))
