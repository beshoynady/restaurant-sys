import { useEffect, useState } from "react";

const useMessages = () => {
  const [showMessages, setShowMessages] =
    useState(false);

  const [messages, setMessages] = useState([]);

  const toggleMessages = () => {
    setShowMessages((prev) => !prev);
  };

  const updateisSeenMessage = (id) => {
    setMessages((prev) =>
      prev.filter((message) => message._id !== id)
    );
  };

  useEffect(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    showMessages,
    toggleMessages,
    updateisSeenMessage,
  };
};

export default useMessages;