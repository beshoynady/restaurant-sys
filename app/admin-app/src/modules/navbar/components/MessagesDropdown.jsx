import { Link } from "react-router-dom";
import useMessages from "../hooks/useMessages";

const MessagesDropdown = () => {
  const {
    messages,
    showMessages,
    toggleMessages,
    updateisSeenMessage,
  } = useMessages();

  return (
    <div className="nav-item mx-1 dropdown position-relative">
      <button
        className="nav-link dropdown-toggle text-light bg-transparent border-0"
        onClick={toggleMessages}
      >
        <i className="bx bx-envelope"></i>

        <span className="badge bg-danger rounded-pill">
          {messages.length}
        </span>
      </button>

      {showMessages && (
        <div
          className="dropdown-menu dropdown-menu-end flex-column show"
          style={{
            position: "absolute",
            minWidth: "320px",
            maxHeight: "400px",
            overflow: "auto",
          }}
        >
          {messages.length > 0 ? (
            messages.map((message) => (
              <Link
                key={message._id}
                to="/message"
                className="dropdown-item text-end"
              >
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <strong>{message.name}</strong>

                    <p className="mb-0 small">
                      {message.message}
                    </p>
                  </div>

                  <i
                    className="material-icons text-danger"
                    style={{
                      cursor: "pointer",
                      fontSize: "18px",
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      updateisSeenMessage(message._id);
                    }}
                  >
                    close
                  </i>
                </div>
              </Link>
            ))
          ) : (
            <span className="dropdown-item text-center">
              لا يوجد رسائل
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default MessagesDropdown;