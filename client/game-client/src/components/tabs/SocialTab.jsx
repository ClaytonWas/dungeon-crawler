import { useState, useRef, useEffect } from 'react'
import { useGameStore } from '../../stores/gameStore'
import toast from 'react-hot-toast'

export default function SocialTab() {
  const { socket, partyId, partyMembers, partyLeaderId, playerId, messages, inHubWorld, inDungeon } = useGameStore()
  const [message, setMessage] = useState('')
  const messagesEndRef = useRef(null)
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  const createParty = () => {
    socket?.emit('createParty')
  }
  
  const joinParty = () => {
    const id = prompt('Enter party ID:')
    if (id) {
      socket?.emit('joinParty', id)
    }
  }
  
  const leaveParty = () => {
    socket?.emit('leaveParty')
  }
  
  const startDungeon = () => {
    if (!partyId) {
      toast.error('Create or join a party first')
      return
    }
    if (partyLeaderId && partyLeaderId !== playerId) {
      toast.error('Only the party leader can start')
      return
    }
    socket?.emit('startDungeon')
  }
  
  const sendMessage = (e) => {
    e.preventDefault()
    if (message.trim()) {
      socket?.emit('sendGlobalUserMessage', message.trim())
      setMessage('')
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Party Section */}
      <div className="glass rounded-lg p-4">
        <h3 className="text-crimson font-semibold mb-4 uppercase tracking-wider text-sm">
          Party
        </h3>
        
        <div className="space-y-3">
          <div className="text-sm">
            <span className="text-gray-400">Party ID: </span>
            <span className="text-white font-mono">
              {partyId || 'Not in a party'}
            </span>
          </div>
          
          {partyMembers.length > 0 && (
            <div className="space-y-2">
              <span className="text-gray-400 text-sm">Members:</span>
              {partyMembers.map(member => (
                <div 
                  key={member.id}
                  className="flex items-center justify-between p-2 bg-black/20 rounded"
                >
                  <span className="text-white text-sm">{member.username}</span>
                  {member.id === partyLeaderId && (
                    <span className="text-xs text-dark-gold">Leader</span>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-2 pt-2">
            {!partyId ? (
              <>
                <button onClick={createParty} className="btn-primary text-xs">
                  Create Party
                </button>
                <button onClick={joinParty} className="btn-primary text-xs">
                  Join Party
                </button>
              </>
            ) : (
              <>
                <button onClick={leaveParty} className="btn-secondary text-xs">
                  Leave Party
                </button>
                <button 
                  onClick={startDungeon} 
                  className="btn-primary text-xs"
                  disabled={partyLeaderId && partyLeaderId !== playerId}
                >
                  Start Dungeon
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Chat Section */}
      <div className="glass rounded-lg p-4 flex flex-col" style={{ height: '300px' }}>
        <h3 className="text-crimson font-semibold mb-2 uppercase tracking-wider text-sm">
          Chat
        </h3>
        <div className="text-xs text-gray-400 mb-3">
          {inHubWorld ? '🌍 Hub World' : inDungeon ? '⚔️ Party Chat' : ''}
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-2 mb-3">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-sm text-center">No messages yet</p>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className="text-sm">
                <span className="text-crimson font-semibold">{msg.username}: </span>
                <span className="text-gray-200">{msg.message}</span>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="input-field flex-1 text-sm"
          />
          <button type="submit" className="btn-primary px-4">
            Send
          </button>
        </form>
      </div>
    </div>
  )
}

