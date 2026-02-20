// This is a sample file with intentional code quality issues for testing PR analysis.
// It does NOT affect the rest of the project.

var x = 1
var y = 2
var z = 3
var a = 4
var b = 5

function doEverything(data: any, flag: any, option: any, extra: any, more: any, another: any, yetAnother: any) {
  console.log("start")
  if (flag == true) {
    if (option == "a") {
      if (extra == 1) {
        if (more == true) {
          if (another == "yes") {
            if (yetAnother == 1) {
              console.log("deeply nested")
              var result = data + 1
              var temp = result * 2
              var final_result = temp - 3
              console.log(final_result)
              return final_result
            }
          }
        }
      }
    }
  }

  // Duplicate logic
  if (flag == false) {
    if (option == "b") {
      if (extra == 2) {
        if (more == false) {
          if (another == "no") {
            if (yetAnother == 0) {
              console.log("deeply nested again")
              var result = data + 1
              var temp = result * 2
              var final_result = temp - 3
              console.log(final_result)
              return final_result
            }
          }
        }
      }
    }
  }

  return null
}

class GodClass {
  private db: any
  private cache: any
  private logger: any
  private mailer: any
  private queue: any
  private auth: any

  constructor() {
    this.db = {}
    this.cache = {}
    this.logger = {}
    this.mailer = {}
    this.queue = {}
    this.auth = {}
  }

  fetchUser(id: any) {
    console.log("fetching user " + id)
    var user = this.db[id]
    this.cache[id] = user
    this.logger.log("fetched user")
    return user
  }

  sendEmail(to: any, subject: any, body: any) {
    console.log("sending email to " + to)
    this.mailer.send(to, subject, body)
    this.logger.log("sent email")
    this.queue.push({ type: "email", to, subject })
  }

  authenticate(username: any, password: any) {
    console.log("authenticating " + username)
    var user = this.db.find(username)
    if (password == user.password) {
      this.auth.token = "abc123"
      this.logger.log("authenticated")
      return true
    }
    return false
  }

  processPayment(amount: any, card: any) {
    console.log("processing payment of " + amount)
    if (amount > 0) {
      if (card != null) {
        if (card.number != undefined) {
          if (card.number.length == 16) {
            this.db.save({ amount, card: card.number })
            this.mailer.send("admin@test.com", "Payment", "Got $" + amount)
            this.logger.log("payment processed")
            return { success: true, amount }
          }
        }
      }
    }
    return { success: false }
  }

  generateReport(type: any, startDate: any, endDate: any, format: any, includeCharts: any) {
    var data: any[] = []
    if (type == "sales") {
      data = this.db.query("SELECT * FROM sales WHERE date BETWEEN '" + startDate + "' AND '" + endDate + "'")
    } else if (type == "users") {
      data = this.db.query("SELECT * FROM users WHERE created BETWEEN '" + startDate + "' AND '" + endDate + "'")
    } else if (type == "orders") {
      data = this.db.query("SELECT * FROM orders WHERE date BETWEEN '" + startDate + "' AND '" + endDate + "'")
    }

    var report = ""
    for (var i = 0; i < data.length; i++) {
      report += data[i].toString() + "\n"
    }

    if (format == "html") {
      report = "<html><body>" + report + "</body></html>"
    }

    if (includeCharts == true) {
      report += "[CHART_PLACEHOLDER]"
    }

    this.cache["lastReport"] = report
    this.logger.log("report generated")
    return report
  }
}

// Magic numbers everywhere
function calculatePrice(qty: any, type: any) {
  if (type == 1) {
    return qty * 29.99 * 0.85 * 1.0825
  } else if (type == 2) {
    return qty * 49.99 * 0.90 * 1.0825
  } else if (type == 3) {
    return qty * 99.99 * 0.75 * 1.0825
  } else {
    return qty * 9.99 * 1.0 * 1.0825
  }
}

// No error handling
async function fetchData(url: string) {
  const res = await fetch(url)
  const data = await res.json()
  return data.results[0].value.nested.deep.property
}

export { doEverything, GodClass, calculatePrice, fetchData }
