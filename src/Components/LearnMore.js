import React from 'react';
import '../Styles/LearnMore.css'; // Import the CSS file


const LearnMore = () => {
  return (
    <div className="learn-more">
      {/* Hero Section */}
      <section className="hero">
        <h1>Revolutionizing Healthcare Management</h1>
        <p>Streamline patient care, doctor schedules, and administrative tasks with our integrated healthcare management system.</p>
        <div className="cta-buttons">
        </div>
      </section>

      {/* Overview Section */}
      <section className="overview">
        <h2>What is Our Healthcare Management System?</h2>
        <p>
          Our system is designed to optimize hospital operations, enhance patient care, and improve communication between patients, doctors, and administrators. With role-based dashboards, smart appointment scheduling, inventory management, and automated medicine reminders, we bring efficiency and innovation to healthcare institutions.
        </p>
      </section>

      {/* Key Features Section */}
      <section className="key-features">
        <h2>Key Features of Our System</h2>
        <div className="features-grid">
          <div className="feature-card">
          <img src={require("../Assets/Role-based dashboard.jpg")} alt="Dashboard" />
            <h3>Role-Based Dashboards</h3>
            <p>Custom dashboards for patients, doctors, and administrators.</p>
          </div>
          <div className="feature-card">
            <img src={require("../Assets/appointment-scheduling.jpg")} alt="Appointment" />
            <h3>Smart Appointment Scheduling</h3>
            <p>Efficiently schedule and manage doctor-patient appointments.</p>
          </div>
          <div className="feature-card">
            <img src={require("../Assets/inventory.jpg")}alt="Inventory" />
            <h3>Inventory Management</h3>
            <p>Track and maintain stock levels of medical supplies.</p>
          </div>
          <div className="feature-card">
            <img src={require("../Assets/medicine-reminder.jpg")} alt="Reminder" />
            <h3>Automated Medicine Reminders</h3>
            <p>Send automated reminders to patients for prescribed medicines.</p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits">
        <h2>Why Choose Our System?</h2>
        <div className="benefits-list">
          <div className="benefit-item">
            <h3>Efficient Workflows</h3>
            <p>Streamline hospital operations and reduce administrative burden.</p>
          </div>
          <div className="benefit-item">
            <h3>Improved Patient Care</h3>
            <p>Enhance patient satisfaction with timely appointments and reminders.</p>
          </div>
          <div className="benefit-item">
            <h3>Better Communication</h3>
            <p>Facilitate seamless communication between patients, doctors, and administrators.</p>
          </div>
          <div className="benefit-item">
            <h3>Cost Savings</h3>
            <p>Optimize inventory management to reduce waste and save costs.</p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials">
        <h2>What Our Users Say</h2>
        <div className="testimonial-cards">
          <div className="testimonial-card">
            <img src={require("../Assets/doctor.jpg")} alt="Dr. Smith" />
            <p>"This system has transformed how we manage patient care. The dashboards are intuitive, and the appointment scheduling is a game-changer!"</p>
            <h4>Dr. Smith, Hospital Administrator</h4>
          </div>
          <div className="testimonial-card">
            <img src={require("../Assets/nurse1.jpg")}alt="Nurse Jane" />
            <p>"The automated reminders have significantly improved patient adherence to treatments."</p>
            <h4>Nurse Jane, Healthcare Provider</h4>
          </div>
        </div>
      </section>

      {/* Call-to-Action Section */}
      <section className="cta">
        <h2>Ready to Transform Your Healthcare Institution?</h2>
      </section>
    </div>
  );
};

export default LearnMore;