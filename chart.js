
const PERCENT_VALUE = Math.PI * 2 / 100
const INTERVAL_VALUE = 10

const WIDTH = 500
const HEIGHT = 500
const CANVAS_COLOR = "#1e1e1e"
const SLICE_RADIUS = 400
const STROKE_COLOR = "white"
const CENTER_RADIUS = 150
const TEXT_COLOR = "white"
const FONT_SIZE = 33
const EMPTY_SLICE_COLOR = "#2d2d2d"
const EMPTY_SLICE_NAME = "Other"
class Chart {
    constructor({
                    parent,
                    data,
                    centerRadius,
                    strokeColor,
                    textColor,
                    fontSize,
                    name,
                    emptySliceColor,
                    canvasColor,
        sliceRadius,
        emptySliceName
                }) {
        this.parent = parent
        this.canvas =  document.createElement("canvas")
        parent.appendChild(this.canvas)

        this.ctx = this.canvas.getContext("2d")

        this.canvasColor = canvasColor || CANVAS_COLOR
        this.canvas.style.width = WIDTH + "px"
        this.canvas.style.height = HEIGHT + "px"
        this.canvas.style.backgroundColor = this.canvasColor

        this.canvas.width = WIDTH * 2
        this.canvas.height = HEIGHT * 2

        this.centerX = this.canvas.width / 2
        this.centerY = this.canvas.height / 2

        this.centerRadius = centerRadius || CENTER_RADIUS
        this.strokeColor =  strokeColor || STROKE_COLOR
        this.textColor = textColor || TEXT_COLOR
        this.fontSize = fontSize || FONT_SIZE
        this.name = name || ""
        this.emptySliceColor = emptySliceColor || EMPTY_SLICE_COLOR
        this.sliceRadius = sliceRadius || SLICE_RADIUS
        this.emptySliceName = emptySliceName || EMPTY_SLICE_NAME

        this.data = this.pushEmptySlice(data)

        this.currentPercent = 0

        this.dashboardHeight = 0
        this.createDashboard()

        this.gapY = parent.offsetTop + this.dashboardHeight
        this.gapX = parent.offsetLeft
        this.collusionArray = []

        this.init()
    }

    init() {
        this.drawChart()
        this.getStrokeFunctions()
        this.drawCenter()
        this.createPopup()
        this.canvas.addEventListener("mousemove", this.mousemoveHandler.bind(this))
    }

    createDashboard() {
        const element = document.createElement("div")
        element.style.width = this.canvas.style.width
        element.style.backgroundColor = this.canvasColor
        element.classList.add("dashboard")
        this.canvas.insertAdjacentElement("beforebegin", element)
        this.data.forEach((item) => {
            element.insertAdjacentHTML("beforeend",
                `
                <div class="dashboard-item">
                    <span class="dashboard-item-before" style="background-color: ${item.color}"></span>
                    <span>${item.name}</span>
                </div>
                `
            )
        })
        this.dashboardHeight = element.clientHeight
    }

    checkInOrOutClick(x, y) {
        return Math.pow(this.centerRadius  / 2, 2) - Math.pow(x - this.centerX / 2 - this.gapX, 2) - Math.pow(y - this.centerY / 2 - this.gapY , 2) > 0
            || Math.pow(this.sliceRadius / 2, 2) - Math.pow(x - this.centerX / 2 - this.gapX , 2) - Math.pow(y - this.centerY / 2 - this.gapY, 2) < 0
    }

    getStrokeFunctions() {
        let total = 0
        this.data.forEach(({percent}, i)=> {
            const start = total * PERCENT_VALUE
            const end = (total + percent) * PERCENT_VALUE
            const centerX = this.centerX / 2 + this.gapX
            const centerY = this.centerY / 2 + this.gapY
            const gapEndStart = end - start

            let startIs270MoreOr90Less = false,
                endIs270MoreOr90Less = false,
                isBigger180 = false

            if (start <= Math.PI / 2 || start >= Math.PI * (3/2)) startIs270MoreOr90Less = true
            if (end <= Math.PI / 2 || end >= Math.PI * (3/2)) endIs270MoreOr90Less = true
            if (gapEndStart > Math.PI) isBigger180 = true

            let k1 = Math.tan(start),
                b1 = centerY - k1 * centerX,
                k2 = Math.tan(end),
                b2 = centerY - k2 *  centerX

            let k2PerpendicularX = false
            if (end.toFixed(5) === (Math.PI / 2).toFixed(5) || end.toFixed(5) === (Math.PI * (3/2)).toFixed(5)) k2PerpendicularX = true

            let k1PerpendicularX = false
            if (start.toFixed(5) === (Math.PI / 2).toFixed(5) || start.toFixed(5) === (Math.PI * (3/2)).toFixed(5)) k1PerpendicularX = true

            let k2PerpendicularY = false
            if (end.toFixed(5) === Math.PI.toFixed(5) || end === 0 || end.toFixed(5) === (Math.PI * 2).toFixed(5)) k2PerpendicularY = true

            let k1PerpendicularY = false
            if (start.toFixed(5) === Math.PI.toFixed(5) || start === 0 || start.toFixed(5) === (Math.PI * 2).toFixed(5)) k1PerpendicularY = true


            this.collusionArray.push({
                k1: k1PerpendicularY || k1PerpendicularX ? 0 : k1,
                b1: k1PerpendicularY || k1PerpendicularX ? 0 : b1,
                k2: k2PerpendicularY || k2PerpendicularX ? 0 : k2,
                b2: k2PerpendicularY || k2PerpendicularX ? 0 : b2,
                startIs270MoreOr90Less,
                endIs270MoreOr90Less,
                isBigger180,
                start,
                end,
                k2PerpendicularY,
                k1PerpendicularY,
                k2PerpendicularX,
                k1PerpendicularX
            })

            total += percent
        })
    }

    createPopup() {
        document.querySelector("body")
            .insertAdjacentHTML("afterbegin", `<div class="popup"></div>`)
    }
    pushEmptySlice(array) {
        const totalPercent = array.reduce((accumulator, {percent}) => {
            return accumulator + percent
        }, 0)
        if (totalPercent < 100) {
            array.push({
                percent: 100 - totalPercent,
                color: this.emptySliceColor,
                name: this.emptySliceName
            })
        }
        return array
    }

    mousemoveHandler(e) {
        const popup = document.querySelector(".popup")
        for (let i = 0; i < this.data.length; i++) {
            let top, bottom
            const coll = this.collusionArray[i]
            const slice = this.data[i]
            const calculation1 =  e.pageY - coll.k1 * e.pageX - coll.b1
            const calculation2 =  e.pageY - coll.k2 * e.pageX - coll.b2

            if (coll.startIs270MoreOr90Less) top = calculation1 > 0
            else top = calculation1 < 0

            if (coll.endIs270MoreOr90Less) bottom = calculation2 < 0
            else bottom = calculation2 > 0


            if (coll.k2PerpendicularY && coll.end.toFixed(5) === (Math.PI * 2).toFixed(5)) bottom = e.pageY < this.centerY / 2 + this.canvas.offsetTop
            if (coll.k2PerpendicularY && coll.end.toFixed(5) === Math.PI.toFixed(5)) bottom = e.pageY > this.centerY / 2 + this.canvas.offsetTop

            if (coll.k2PerpendicularX && coll.end.toFixed(5) === (Math.PI / 2).toFixed(5)) bottom = e.pageX > this.centerX / 2 + this.canvas.offsetLeft
            if (coll.k2PerpendicularX && coll.end.toFixed(5) === (Math.PI * (3/2)).toFixed(5)) bottom = e.pageX < this.centerX / 2 + this.canvas.offsetLeft

            if (coll.k1PerpendicularY && coll.start.toFixed(5) === (Math.PI * 2).toFixed(5)) top = e.pageY > this.centerY / 2 + this.canvas.offsetTop
            if (coll.k1PerpendicularY && coll.start.toFixed(5) === Math.PI.toFixed(5)) top = e.pageY < this.centerY / 2 + this.canvas.offsetTop

            if (coll.k1PerpendicularX && coll.start.toFixed(5) === (Math.PI / 2).toFixed(5)) top = e.pageX < this.centerX / 2 + this.canvas.offsetLeft
            if (coll.k1PerpendicularX && coll.start.toFixed(5) === (Math.PI * (3/2)).toFixed(5)) top = e.pageX > this.centerX / 2 + this.canvas.offsetLeft


            if (top && bottom || (coll.isBigger180 && (top || bottom))) {
                popup.style.display = "flex"
                popup.style.transform = `translate(${e.pageX}px, ${e.pageY}px)`
                popup.textContent = slice.name + " " + slice.percent + "%"
            }

            if (this.checkInOrOutClick(e.pageX, e.pageY)) popup.style.display = "none"
        }
    }

    drawChart() {
        for (const {color, percent} of this.data) {
            const sliceCurrentPercent = this.currentPercent
            let angle  = 0
            const intervalId = setInterval(() => {
                if (angle >= percent) clearInterval(intervalId)

                this.ctx.beginPath()
                this.ctx.fillStyle = color
                this.ctx.moveTo(this.centerX, this.centerY)
                this.ctx.arc(
                    this.centerX,
                    this.centerY,
                    this.sliceRadius,
                    sliceCurrentPercent * PERCENT_VALUE,
                    (sliceCurrentPercent + angle) * PERCENT_VALUE
                )
                this.ctx.fill()
                this.ctx.strokeStyle = this.strokeColor
                this.ctx.stroke()
                this.ctx.closePath()

                this.drawCenter()

                angle += 1
            }, INTERVAL_VALUE)

            this.currentPercent += percent
        }
    }

    drawCenter() {
        this.ctx.beginPath()
        this.ctx.fillStyle = this.canvas.style.backgroundColor
        this.ctx.arc(
            this.centerX,
            this.centerY,
            this.centerRadius,
            0,
            Math.PI * 2
        )
        this.ctx.fill()
        this.ctx.strokeStyle = this.strokeColor
        this.ctx.stroke()

        this.ctx.fillStyle = this.textColor
        this.ctx.font = `${this.fontSize}px serif`
        this.ctx.textAlign = "center"
        this.ctx.fillText(this.name, this.centerX, this.centerY)
        this.ctx.closePath()
    }
}

new Chart({
    parent: document.querySelector(".wrapper"),
    data: [
        {
            percent: 25,
            color: "#9255d9",
            name: "Fight club"
        },
        {
            percent: 25,
            color: "#49945a",
            name: "Revolver"
        },
        {
            percent: 25,
            color: "#e59d59",
            name: "Forrest Gump"
        },
    ],
    name: "Favorite films"
})
