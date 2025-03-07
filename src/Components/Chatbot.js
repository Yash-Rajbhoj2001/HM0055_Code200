import React, { useState, useRef, useEffect } from 'react';
import '../Styles/Chatbot.css';

const Chatbot = () => {
  // State variables from your original component
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      text: "Hello! I'm MEDILOG Assistant. How can I help you today with your healthcare needs?",
      isBot: true,
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Add conversation context tracking
  const [conversationContext, setConversationContext] = useState({
    userName: null,
    userType: null, // 'patient', 'doctor', etc.
    currentTopic: null,
    appointmentInfo: {
      doctor: null,
      date: null,
      time: null,
      reason: null
    },
    recentTopics: [],
    sentimentScore: 0, // -5 to 5 scale for tracking user sentiment
    interactionCount: 0
  });

  // Conversation flow management
  const conversationManager = {
    // Identify intent from user input
    identifyIntent(input) {
      const lowercaseInput = input.toLowerCase();
      
      // Map common phrases to intents
      const intentPatterns = {
        greeting: /^(hi|hello|hey|good morning|good afternoon|good evening)/i,
        appointment_booking: /(book|schedule|make|set up)[\s\w]*appointment/i,
        appointment_info: /(check|view|see|about)[\s\w]*(my appointment|appointments)/i,
        medical_records: /(medical|health|patient)[\s\w]*(record|history|file)/i,
        prescription: /(prescription|medicine|medication|refill)/i,
        doctor_info: /(doctor|physician|specialist|provider)[\s\w]*(available|who|list|information)/i,
        payment: /(bill|payment|pay|cost|price|fee|insurance)/i,
        login_help: /(login|sign in|password|username|account|forgot)/i,
        general_question: /(what|how|when|where|why|can|do)/i,
        gratitude: /(thank|thanks|appreciate)/i,
        negative: /(cannot|can't|don't|not working|problem|issue|error|frustrated|upset)/i,
        farewell: /(bye|goodbye|see you|farewell|exit|quit|end)/i
      };
      
      // Check each pattern and return the first match
      for (const [intent, pattern] of Object.entries(intentPatterns)) {
        if (pattern.test(lowercaseInput)) {
          return intent;
        }
      }
      
      // Default intent if no patterns match
      return "general_info";
    },
    
    // Extract entities from user input (like dates, names, etc.)
    extractEntities(input) {
      const entities = {};
      const lowercaseInput = input.toLowerCase();
      
      // Extract doctor references
      const doctorMatch = lowercaseInput.match(/dr\.?\s+([a-z]+)/i) || 
                          lowercaseInput.match(/doctor\s+([a-z]+)/i);
      if (doctorMatch) {
        entities.doctor = doctorMatch[1];
      }
      
      // Extract date references
      const dateKeywords = ['today', 'tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      dateKeywords.forEach(day => {
        if (lowercaseInput.includes(day)) {
          entities.date = day;
        }
      });
      
      // Extract time references
      const timeMatch = lowercaseInput.match(/(\d{1,2})(:\d{2})?\s*(am|pm)?/i);
      if (timeMatch) {
        entities.time = timeMatch[0];
      }
      
      // Extract medical conditions/symptoms
      const commonConditions = ['headache', 'fever', 'cough', 'pain', 'allergy', 'rash', 'checkup', 'follow-up'];
      commonConditions.forEach(condition => {
        if (lowercaseInput.includes(condition)) {
          entities.condition = condition;
        }
      });
      
      return entities;
    },
    
    // Update conversation context based on user input
    updateContext(input, currentContext) {
      const newContext = {...currentContext};
      const intent = this.identifyIntent(input);
      const entities = this.extractEntities(input);
      
      // Update interaction count
      newContext.interactionCount += 1;
      
      // Track current topic
      newContext.currentTopic = intent;
      
      // Add to recent topics (keep last 3)
      newContext.recentTopics.unshift(intent);
      if (newContext.recentTopics.length > 3) {
        newContext.recentTopics.pop();
      }
      
      // Update appointment info if entities were found
      if (entities.doctor) newContext.appointmentInfo.doctor = entities.doctor;
      if (entities.date) newContext.appointmentInfo.date = entities.date;
      if (entities.time) newContext.appointmentInfo.time = entities.time;
      if (entities.condition) newContext.appointmentInfo.reason = entities.condition;
      
      // Update sentiment (simple rule-based approach)
      const positiveWords = ['thanks', 'good', 'great', 'awesome', 'helpful', 'appreciate'];
      const negativeWords = ['bad', 'wrong', 'not', 'problem', 'issue', 'error', 'confused'];
      
      positiveWords.forEach(word => {
        if (input.toLowerCase().includes(word)) newContext.sentimentScore += 1;
      });
      
      negativeWords.forEach(word => {
        if (input.toLowerCase().includes(word)) newContext.sentimentScore -= 1;
      });
      
      // Cap sentiment score between -5 and 5
      newContext.sentimentScore = Math.max(-5, Math.min(5, newContext.sentimentScore));
      
      // Try to extract name if not already known (simple heuristic)
      if (!newContext.userName) {
        const nameMatch = input.match(/my name is ([a-z]+)/i) || 
                         input.match(/i am ([a-z]+)/i) ||
                         input.match(/this is ([a-z]+)/i);
        if (nameMatch) {
          newContext.userName = nameMatch[1];
        }
      }
      
      return newContext;
    },
    
    // Generate response based on intent, entities, and context
    generateResponse(intent, entities, context, input) {
      // Personalize greeting if we know the user's name
      const personalGreeting = context.userName ? `, ${context.userName}` : "";
      
      const responses = {
        // Greeting responses that adapt to conversation context
        greeting: () => {
          if (context.interactionCount > 5) {
            return `Hello again${personalGreeting}! How else can I help you with MEDILOG today?`;
          } else {
            return `Hello${personalGreeting}! How can I help you with MEDILOG today? I can assist with appointments, prescriptions, medical records, and more.`;
          }
        },
        
        // Appointment booking responses
        appointment_booking: () => {
          // Check if we have partial appointment info
          const { doctor, date, time, reason } = context.appointmentInfo;
          
          if (doctor && date && time) {
            return `Great! I've got all the details. I'm setting up your appointment with Dr. ${doctor} on ${date} at ${time}${reason ? ` for your ${reason}` : ''}. Is this correct? If so, I'll confirm this booking.`;
          } else if (doctor && date) {
            return `I see you want to book with Dr. ${doctor} on ${date}. What time would work best for you?`;
          } else if (doctor) {
            return `I see you'd like to book an appointment with Dr. ${doctor}. What day would work best for you?`;
          } else if (date) {
            return `I see you're looking for an appointment on ${date}. Which doctor would you like to see?`;
          } else {
            return `I'd be happy to help you book an appointment. Do you have a specific doctor you'd like to see, or would you prefer to see who's available on a particular day?`;
          }
        },
        
        // Medical records responses
        medical_records: () => {
          if (context.interactionCount < 3) {
            return `To access your medical records, you can go to the "Records" section in your patient portal. Would you like me to guide you through finding specific information in your records?`;
          } else {
            return `Your medical records are available in your patient portal. Based on our conversation, are you looking for a specific type of record${context.appointmentInfo.reason ? ` related to your ${context.appointmentInfo.reason}` : ''}?`;
          }
        },
        
        // Prescription responses
        prescription: () => {
          if (entities.condition) {
            return `For prescriptions related to your ${entities.condition}, you can view current medications and request refills through the "Prescriptions" tab. Would you like me to show you how to request a refill?`;
          } else {
            return `You can manage all your prescriptions in the "Prescriptions" section of your patient portal. You can view active medications, request refills, and see your medication history. What specifically do you need help with regarding prescriptions?`;
          }
        },
        
        // Doctor information responses
        doctor_info: () => {
          if (entities.doctor) {
            return `Dr. ${entities.doctor} is in our system. Would you like to see their availability for appointments, read their bio, or see their patient reviews?`;
          } else if (entities.condition) {
            return `For ${entities.condition}, we have several specialists available. Would you like me to show you a list of doctors who specialize in this area?`;
          } else {
            return `We have many qualified doctors in our network. Are you looking for a specialist in a particular field, or would you like to see our general practitioners?`;
          }
        },
        
        // Payment and billing responses
        payment: () => {
          return `You can view and pay bills through the "Billing" section of your patient portal. We accept most major insurance plans and offer payment plans for larger expenses. Would you like information about a specific bill or our payment options?`;
        },
        
        // Login help responses
        login_help: () => {
          if (input.toLowerCase().includes('forgot')) {
            return `If you've forgotten your password, click the "Forgot Password" link on the login page. You'll receive an email with instructions to reset it. Is there anything else about account access I can help with?`;
          } else {
            return `To log in to your MEDILOG account, go to our homepage and click "Login" in the top right corner. Enter your email and password to access your patient portal. If you're having trouble, I can help troubleshoot.`;
          }
        },
        
        // General information
        general_info: () => {
          if (context.interactionCount < 2) {
            return `MEDILOG is a comprehensive healthcare platform that connects you with doctors and manages your health information securely. What specific aspect would you like to know more about?`;
          } else {
            return `Is there something specific about MEDILOG that I can clarify for you? I'm here to help with any questions about our services.`;
          }
        },
        
        // General questions
        general_question: () => {
          // Try to route to a more specific intent based on recent conversation
          if (context.recentTopics.includes('appointment_booking')) {
            return responses.appointment_booking();
          } else if (context.recentTopics.includes('medical_records')) {
            return responses.medical_records();
          } else if (context.recentTopics.includes('prescription')) {
            return responses.prescription();
          } else {
            return `I'd be happy to answer your question. MEDILOG offers comprehensive healthcare management including appointments, records, prescriptions, and more. Could you provide a bit more detail about what you'd like to know?`;
          }
        },
        
        // Gratitude responses
        gratitude: () => {
          if (context.sentimentScore > 2) {
            return `You're very welcome${personalGreeting}! I'm glad I could be helpful. Is there anything else you'd like to know about MEDILOG?`;
          } else {
            return `You're welcome! Is there anything else I can assist you with today?`;
          }
        },
        
        // Negative feedback responses
        negative: () => {
          if (context.sentimentScore < -3) {
            return `I'm very sorry for the difficulties you're experiencing. I'd like to connect you with our support team who can provide more personalized assistance. Would you like me to arrange that for you?`;
          } else {
            return `I apologize for any confusion or difficulty. Let me try to help resolve this issue. Could you provide a bit more detail about what's not working as expected?`;
          }
        },
        
        // Farewell responses
        farewell: () => {
          if (context.interactionCount > 5 && context.sentimentScore > 0) {
            return `Thank you for chatting with MEDILOG Assistant${personalGreeting}! It was a pleasure helping you today. Feel free to return anytime you need assistance with your healthcare needs.`;
          } else {
            return `Goodbye! If you need any help in the future, MEDILOG Assistant will be here. Have a great day!`;
          }
        }
      };
      
      // Get appropriate response based on intent
      if (responses[intent]) {
        return responses[intent]();
      }
      
      // Fallback response
      return `I understand you're asking about ${intent.replace('_', ' ')}. Could you provide a bit more detail so I can better assist you?`;
    }
  };

  // Auto-scroll to the bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Toggle chatbot open/close
  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  // Handle input change
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  // Handle sending message with enhanced conversation flow
  const handleSendMessage = async () => {
    if (inputValue.trim() === '' && !selectedImage) return;

    // Add user message to chat
    const userMessage = {
      text: inputValue,
      isBot: false,
      image: selectedImage,
    };
    setMessages([...messages, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Process the message through conversation manager
    const userInput = inputValue;
    setTimeout(() => {
      // Update conversation context based on user input
      const intent = conversationManager.identifyIntent(userInput);
      const entities = conversationManager.extractEntities(userInput);
      const updatedContext = conversationManager.updateContext(userInput, conversationContext);
      setConversationContext(updatedContext);
      
      // Generate appropriate response
      const botResponse = conversationManager.generateResponse(intent, entities, updatedContext, userInput);
      
      // Add response to chat
      setMessages(prev => [...prev, { text: botResponse, isBot: true }]);
      setIsLoading(false);
      setSelectedImage(null);
    }, 1000);
  };

  // Handle pressing Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  // Handle emoji selection
  const handleEmojiClick = (emoji) => {
    setInputValue(inputValue + emoji);
    setShowEmojiPicker(false);
  };

  // Toggle emoji picker
  const toggleEmojiPicker = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  // Simple emoji picker component
  const EmojiPicker = ({ onEmojiClick }) => {
    const emojis = ['😊', '👍', '🙏', '❤', '👩‍⚕', '👨‍⚕', '💊', '🏥', '📅', '📝', '🔍', '📱'];
    return (
      <div className="emoji-picker">
        {emojis.map((emoji, index) => (
          <span key={index} onClick={() => onEmojiClick(emoji)}>
            {emoji}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="chatbot-container">
      {/* Chat toggle button */}
      <button className="chat-toggle" onClick={toggleChat}>
        {isOpen ? '✕' : '💬'}
      </button>
      
      {/* Chatbot interface */}
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <h3>MEDILOG Assistant</h3>
          </div>
          
          <div className="messages-container">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`message ${message.isBot ? 'bot-message' : 'user-message'}`}
              >
                {message.image && (
                  <div className="image-container">
                    <img src={message.image} alt="Uploaded" />
                  </div>
                )}
                <div className="message-text">{message.text}</div>
              </div>
            ))}
            
            {isLoading && (
              <div className="bot-message loading">
                <div className="loading-animation">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          <div className="input-container">
            {selectedImage && (
              <div className="selected-image-preview">
                <img src={selectedImage} alt="Selected" />
                <button onClick={() => setSelectedImage(null)}>✕</button>
              </div>
            )}
            
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here..."
            />
            
            <button className="emoji-button" onClick={toggleEmojiPicker}>
              😊
            </button>
            
            <button className="upload-button" onClick={triggerFileInput}>
              📎
            </button>
            
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleImageUpload}
            />
            
            <button className="send-button" onClick={handleSendMessage}>
              ↑
            </button>
          </div>
          
          {showEmojiPicker && (
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          )}
        </div>
      )}
    </div>
  );
};

export default Chatbot;