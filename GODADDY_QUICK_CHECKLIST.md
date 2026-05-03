# GoDaddy DNS Setup - Quick Checklist ✅

## For: billbytekot.in → support@billbytekot.in

---

## 🎯 Before You Start

**Question**: Do you currently receive emails at billbytekot.in?
- ✅ **NO** → Use main domain (support@billbytekot.in)
- ⚠️ **YES** → Use subdomain (support@inbound.billbytekot.in)

---

## 📝 Step-by-Step Checklist

### ☐ Step 1: Add Domain to Resend (5 min)
1. Go to https://resend.com/domains
2. Click "Add Domain"
3. Enter: `billbytekot.in`
4. **Keep this page open** - you'll need to copy DNS values

---

### ☐ Step 2: Login to GoDaddy (1 min)
1. Go to https://www.godaddy.com
2. Sign in
3. Go to "My Products"
4. Find billbytekot.in → Click "DNS"

---

### ☐ Step 3: Add TXT Record (2 min)
In GoDaddy DNS:
- Click "Add"
- Type: **TXT**
- Name: **@**
- Value: **[Copy from Resend - starts with "resend-verify="]**
- TTL: 1 Hour
- Click "Save"

---

### ☐ Step 4: Add CNAME Record #1 (2 min)
- Click "Add"
- Type: **CNAME**
- Name: **resend._domainkey**
- Value: **[Copy from Resend]**
- TTL: 1 Hour
- Click "Save"

---

### ☐ Step 5: Add CNAME Record #2 (2 min)
- Click "Add"
- Type: **CNAME**
- Name: **resend2._domainkey**
- Value: **[Copy from Resend]**
- TTL: 1 Hour
- Click "Save"

---

### ☐ Step 6: Add CNAME Record #3 (2 min)
- Click "Add"
- Type: **CNAME**
- Name: **resend3._domainkey**
- Value: **[Copy from Resend]**
- TTL: 1 Hour
- Click "Save"

---

### ☐ Step 7: Add MX Record (2 min)

**If NOT using billbytekot.in for email currently:**
- Click "Add"
- Type: **MX**
- Name: **@**
- Priority: **10**
- Value: **mx.resend.com**
- TTL: 1 Hour
- Click "Save"

**If ALREADY using billbytekot.in for email:**
- Click "Add"
- Type: **MX**
- Name: **inbound**
- Priority: **10**
- Value: **mx.resend.com**
- TTL: 1 Hour
- Click "Save"

---

### ☐ Step 8: Wait for DNS (30-60 min)
- DNS changes take time to propagate
- Go get coffee ☕
- Check status: `nslookup -type=MX billbytekot.in`

---

### ☐ Step 9: Verify Domain in Resend (1 min)
1. Go back to Resend → Domains
2. Find billbytekot.in
3. Click "Verify"
4. Should show ✅ Verified

---

### ☐ Step 10: Enable Receiving (1 min)
1. In Resend → Domains → billbytekot.in
2. Find "Receiving" section
3. Toggle ON
4. Save

---

### ☐ Step 11: Add Webhook (2 min)
1. Go to https://resend.com/webhooks
2. Click "Add Webhook"
3. URL: `https://puls1.onrender.com/api/webhooks/resend/b175df83-350d-49f0-9eef-e2f1b2a5164e`
4. Event: Check `email.received` ✅
5. Click "Add"

---

### ☐ Step 12: Deploy Backend (2 min)
```bash
git add backend/server.py
git commit -m "Fix Resend webhook"
git push
```
Wait for Render to deploy.

---

### ☐ Step 13: Test! (1 min)
Send email to:
- Main domain: `support@billbytekot.in`
- OR Subdomain: `support@inbound.billbytekot.in`

Check:
- ✅ Resend Dashboard → Emails → Receiving
- ✅ Resend Dashboard → Webhooks → Recent Deliveries
- ✅ Your app → Emails page
- ✅ Your app → Tickets page

---

## 🎉 Success Indicators

You'll know it's working when:
- ✅ Domain shows "Verified" in Resend
- ✅ MX record shows `mx.resend.com` in nslookup
- ✅ Test email appears in Resend dashboard
- ✅ Webhook shows 200 OK in Recent Deliveries
- ✅ Email appears in your app's Emails page
- ✅ Ticket auto-created in Tickets page

---

## ⏱️ Total Time

- **Active work**: ~20 minutes
- **DNS propagation**: 30-60 minutes
- **Total**: ~1 hour

---

## 🆘 Quick Help

**DNS not propagating?**
- Wait longer (can take up to 24 hours)
- Check: `nslookup -type=MX billbytekot.in`

**Domain not verifying?**
- Wait 30 minutes
- Check TXT record in GoDaddy
- Click "Verify" again

**Emails not received?**
- Check MX record is correct
- Check "Receiving" is ON in Resend
- Check webhook has `email.received` event
- Check backend logs in Render

---

## 📧 Your Email Address

After setup, customers send emails to:
- **Main domain**: `support@billbytekot.in`
- **OR Subdomain**: `support@inbound.billbytekot.in`

Both will appear in your CRM! 🎉

---

## 📄 Full Guide

For detailed instructions with screenshots, see:
**GODADDY_DNS_SETUP_GUIDE.md**
