import React from 'react';

const Chat = () => {
  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-8rem)]">
        {/* Sidebar */}
        <div className="col-span-3 bg-white rounded-lg shadow-md p-4">
          <h2 className="text-xl font-semibold mb-4">Chats</h2>
          {/* Chat list will go here */}
        </div>

        {/* Main chat area */}
        <div className="col-span-9 bg-white rounded-lg shadow-md p-4">
          <div className="h-full flex flex-col">
            <div className="border-b pb-4">
              <h2 className="text-xl font-semibold">Select a chat to start messaging</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto py-4">
              {/* Messages will go here */}
            </div>

            <div className="border-t pt-4">
              {/* Message input will go here */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;