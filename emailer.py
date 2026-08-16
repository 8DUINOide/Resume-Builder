import smtplib
from email.message import EmailMessage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import os
from dotenv import load_dotenv

load_dotenv()

class EmailNotifier:
    """Handle email notifications for orders"""
    
    def __init__(self):
        self.shop_email = os.getenv('SHOP_EMAIL', 'your-shop@example.com')
        self.email_password = os.getenv('EMAIL_PASSWORD', '')
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
    
    def send_order_confirmation(self, customer_email, customer_name, ref_id):
        """Send order confirmation to customer"""
        if not self.email_password:
            print("Warning: EMAIL_PASSWORD not configured")
            return False
        
        try:
            msg = MIMEMultipart()
            msg['From'] = self.shop_email
            msg['To'] = customer_email
            msg['Subject'] = f'Resume Order Confirmation - {ref_id}'
            
            body = f"""
            Dear {customer_name},
            
            Thank you for your resume order!
            
            Your Reference ID: {ref_id}
            
            Your order has been received and is being processed. You can present this Reference ID at our shop for pickup.
            
            Estimated processing time: 30-60 minutes
            
            If you have any questions, please contact us.
            
            Best regards,
            Your Resume Shop Team
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.shop_email, self.email_password)
                server.send_message(msg)
            
            print(f"Order confirmation sent to {customer_email}")
            return True
            
        except Exception as e:
            print(f"Error sending order confirmation: {e}")
            return False
    
    def send_new_order_notification(self, ref_id, customer_name, customer_email, customer_phone, template_type):
        """Send notification to shop about new order"""
        if not self.email_password:
            print("Warning: EMAIL_PASSWORD not configured")
            return False
        
        try:
            msg = MIMEMultipart()
            msg['From'] = self.shop_email
            msg['To'] = self.shop_email
            msg['Subject'] = f'New Resume Order - {ref_id}'
            
            body = f"""
            NEW ORDER RECEIVED
            
            Reference ID: {ref_id}
            Customer Name: {customer_name}
            Customer Email: {customer_email}
            Customer Phone: {customer_phone}
            Template Type: {template_type}
            
            Please process this order. Use the Reference ID to retrieve the order details in the admin panel.
            
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.shop_email, self.email_password)
                server.send_message(msg)
            
            print(f"New order notification sent for {ref_id}")
            return True
            
        except Exception as e:
            print(f"Error sending new order notification: {e}")
            return False
    
    def send_order_ready_notification(self, customer_email, customer_name, ref_id):
        """Send notification when order is ready for pickup"""
        if not self.email_password:
            print("Warning: EMAIL_PASSWORD not configured")
            return False
        
        try:
            msg = MIMEMultipart()
            msg['From'] = self.shop_email
            msg['To'] = customer_email
            msg['Subject'] = f'Your Resume is Ready - {ref_id}'
            
            body = f"""
            Dear {customer_name},
            
            Great news! Your resume is ready for pickup.
            
            Reference ID: {ref_id}
            
            Please visit our shop with your Reference ID to collect your printed resume.
            
            Shop Hours: 9:00 AM - 6:00 PM
            Location: [Add your shop address here]
            
            Thank you for choosing our service!
            
            Best regards,
            Your Resume Shop Team
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.shop_email, self.email_password)
                server.send_message(msg)
            
            print(f"Order ready notification sent to {customer_email}")
            return True
            
        except Exception as e:
            print(f"Error sending order ready notification: {e}")
            return False

# Global email notifier instance
email_notifier = EmailNotifier()
