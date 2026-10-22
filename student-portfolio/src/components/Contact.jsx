import { useState } from "react";

function Contact() {
  const [showDetails, setShowDetails] = useState(false);
  const [name, setName] = useState("");

  return (
    <div className="card">
      <h2>Contact Me</h2>
      <p>Feel free to reach out if you want to collaborate on a project.</p>

      <button className="toggle-btn" onClick={() => setShowDetails((prev) => !prev)}>
        {showDetails ? "Hide contact details" : "Show contact details"}
      </button>

      {showDetails && (
        <div className="contact-details">
          <p>Email: 24dce049@charusat.edu.in</p>
          <p>Location: Gujarat, India</p>
        </div>
      )}

      <label className="form-label" htmlFor="name">
        Your name
      </label>
      <input
        id="name"
        className="form-input"
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Type your name"
      />

      <p className="form-preview">
        {name ? `Hello, ${name}! I would love to connect.` : "Type your name to see a live preview."}
      </p>
    </div>
  );
}

export default Contact;
