import React, { useState, useRef, useEffect } from 'react';
import '../Styles/Chatbot.css';
import { getDatabase, ref, get } from 'firebase/database';
import db from '../firebase'; // Adjust the path to your Firebase configuration file

const Chatbot = () => {
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

  const [conversationContext, setConversationContext] = useState({
    userName: null,
    userType: null,
    currentTopic: null,
    appointmentInfo: {
      doctor: null,
      date: null,
      time: null,
      reason: null,
    },
    recentTopics: [],
    sentimentScore: 0,
    interactionCount: 0,
  });

  // Fetch patient information
  const fetchPatientInfo = async (patientId) => {
    const patientRef = ref(db, `patient/${patientId}`);
    try {
      const snapshot = await get(patientRef);
      if (snapshot.exists()) {
        return snapshot.val();
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching patient info:', error);
      return null;
    }
  };

  // Fetch medicine information
  const fetchMedicineInfo = async (medicineName) => {
    const medicineRef = ref(db, `medicine/${medicineName}`);
    try {
      const snapshot = await get(medicineRef);
      if (snapshot.exists()) {
        return snapshot.val();
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching medicine info:', error);
      return null;
    }
  };

  // Fetch appointment information
  const fetchAppointmentInfo = async (appointmentId) => {
    const appointmentRef = ref(db, `Appointment/${appointmentId}`);
    try {
      const snapshot = await get(appointmentRef);
      if (snapshot.exists()) {
        return snapshot.val();
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching appointment info:', error);
      return null;
    }
  };

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
        farewell: /(bye|goodbye|see you|farewell|exit|quit|end)/i,
        patient_record: /(patient|record|history)[\s\w]*(id|number)/i,
        medicine_info: /(medicine|drug|medication)[\s\w]*(info|information|details)/i,
        appointment_details: /(details|info|information)[\s\w]*appointment/i, // Updated pattern
      };

      // Check each pattern and return the first match
      for (const [intent, pattern] of Object.entries(intentPatterns)) {
        if (pattern.test(lowercaseInput)) {
          return intent;
        }
      }

      // Default intent if no patterns match
      return 'general_info';
    },

    // Extract entities from user input
    extractEntities(input) {
      const entities = {};
      const lowercaseInput = input.toLowerCase();

      // Extract appointment ID references
      const appointmentIdMatch = lowercaseInput.match(/appointment\s+([a-z0-9_]+)/i); // Updated regex
      if (appointmentIdMatch) {
        entities.appointmentId = appointmentIdMatch[1];
      }

      // Extract patient ID references
      const patientIdMatch = lowercaseInput.match(/patient\s+(\d+)/i);
      if (patientIdMatch) {
        entities.patientId = patientIdMatch[1];
      }

      // Extract medicine name references
      const medicineNameMatch = lowercaseInput.match(/medicine\s+([a-z0-9]+)/i);
      if (medicineNameMatch) {
        entities.medicineName = medicineNameMatch[1];
      }

      // Extract doctor references
      const doctorMatch =
        lowercaseInput.match(/dr\.?\s+([a-z]+)/i) ||
        lowercaseInput.match(/doctor\s+([a-z]+)/i);
      if (doctorMatch) {
        entities.doctor = doctorMatch[1];
      }

      // Extract date references
      const dateKeywords = [
        'today',
        'tomorrow',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ];
      dateKeywords.forEach((day) => {
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
      const commonConditions = [
        'headache',
        'fever',
        'cough',
        'pain',
        'allergy',
        'rash',
        'checkup',
        'follow-up',
      ];
      commonConditions.forEach((condition) => {
        if (lowercaseInput.includes(condition)) {
          entities.condition = condition;
        }
      });

      return entities;
    },

    // Update conversation context
    updateContext(input, currentContext) {
      const newContext = { ...currentContext };
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

      positiveWords.forEach((word) => {
        if (input.toLowerCase().includes(word)) newContext.sentimentScore += 1;
      });

      negativeWords.forEach((word) => {
        if (input.toLowerCase().includes(word)) newContext.sentimentScore -= 1;
      });

      // Cap sentiment score between -5 and 5
      newContext.sentimentScore = Math.max(-5, Math.min(5, newContext.sentimentScore));

      // Try to extract name if not already known
      if (!newContext.userName) {
        const nameMatch =
          input.match(/my name is ([a-z]+)/i) ||
          input.match(/i am ([a-z]+)/i) ||
          input.match(/this is ([a-z]+)/i);
        if (nameMatch) {
          newContext.userName = nameMatch[1];
        }
      }

      return newContext;
    },

    // Generate response based on intent, entities, and context
    async generateResponse(intent, entities, context, input) {
      // Personalize greeting if we know the user's name
      const personalGreeting = context.userName ? `, ${context.userName}` : '';

      const responses = {
        // Existing responses...

        // New response for appointment details
        appointment_details: async () => {
          if (entities.appointmentId) {
            const appointmentInfo = await fetchAppointmentInfo(entities.appointmentId);
            if (appointmentInfo) {
              return `Here is the information for appointment ${entities.appointmentId}:
              - Doctor: ${appointmentInfo.doctorname}
              - Date: ${appointmentInfo.date}
              - Treatment: ${appointmentInfo.treatmentOn}
              - Note: ${appointmentInfo.note}`;
            } else {
              return `I couldn't find any information for the appointment with ID ${entities.appointmentId}.`;
            }
          } else {
            return `Please provide an appointment ID to fetch its details.`;
          }
        },

        // Fallback response
        general_info: () => {
          return `I understand you're asking about ${intent.replace('_', ' ')}. Could you provide a bit more detail so I can better assist you?`;
        },
      };

      // Get appropriate response based on intent
      if (responses[intent]) {
        return await responses[intent]();
      }

      // Fallback response
      return `I understand you're asking about ${intent.replace('_', ' ')}. Could you provide a bit more detail so I can better assist you?`;
    },
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

  // Handle sending message
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
    const intent = conversationManager.identifyIntent(userInput);
    const entities = conversationManager.extractEntities(userInput);
    const updatedContext = conversationManager.updateContext(userInput, conversationContext);
    setConversationContext(updatedContext);

    // Generate appropriate response
    const botResponse = await conversationManager.generateResponse(intent, entities, updatedContext, userInput);

    // Add response to chat
    setMessages((prev) => [...prev, { text: botResponse, isBot: true }]);
    setIsLoading(false);
    setSelectedImage(null);
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

      {/* Chat window */}
      {isOpen && (
        <div className="chat-window">
          {/* Chat header */}
          <div className="chat-header">
            <h3>MEDILOG Assistant</h3>
            <button className="close-button" onClick={toggleChat}>
              ✕
            </button>
          </div>

          {/* Chat messages */}
          <div className="chat-messages">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`message ${message.isBot ? 'bot-message' : 'user-message'}`}
              >
                {message.image && (
                  <img
                    src={message.image}
                    alt="User upload"
                    className="message-image"
                  />
                )}
                <p>{message.text}</p>
              </div>
            ))}
            {isLoading && (
              <div className="message bot-message">
                <p>Typing...</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat input area */}
          <div className="chat-input">
            {/* Emoji picker */}
            <button className="emoji-button" onClick={toggleEmojiPicker}>
              😊
            </button>
            {showEmojiPicker && (
              <EmojiPicker onEmojiClick={handleEmojiClick} />
            )}

            {/* Text input */}
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={isLoading}
            />

            {/* Image upload */}
            <button className="image-upload-button" onClick={triggerFileInput}>
              📷
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleImageUpload}
              accept="image/*"
            />

            {/* Send button */}
            <button
              className="send-button"
              onClick={handleSendMessage}
              disabled={isLoading}
            >
              {isLoading ? '⏳' : '✉️'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;