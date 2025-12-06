import { useState, useEffect } from "react";
import "../css/message-box.css";

function Message(props) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const messageType = props.type === "model" ? "model" : "user";
  const wrapperClass = `message-wrapper ${messageType}-message${isVisible ? " fade-in" : ""}`;
  const bubbleClass = `message-bubble ${messageType}`;

  return (
    <div className={wrapperClass}>
      <div className={bubbleClass}  style={{ whiteSpace: "pre-line" }}>
        {props.body}
      </div>
    </div>
  );
}

export default Message;