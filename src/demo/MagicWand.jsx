import React from 'react'
import MagicWand from 'magic-wand-tool'
import $ from 'jquery'

import styles from './MagicWand.css'

class MagicWandDemo extends React.Component {
    constructor() {
        super()
        const colorThreshold = 15
        this.state = {
            colorThreshold,
            blurRadius: 5,
            simplifyTolerant: 0,
            simplifyCount: 30,
            hatchLength: 4,
            hatchOffset: 0,

            imageInfo: null,
            cacheInd: null,
            mask: null,
            downPoint: null,
            allowDraw: false,
            currentThreshold: colorThreshold
        }
    }

    uploadClick() {
        document.getElementById("file-upload").click();
    };
    onRadiusChange(e) {
        blurRadius = e.target.value;
    };
    imgChange(event) {
        const inp = event.target
        if (inp.files && inp.files[0]) {
            var reader = new FileReader();
            let _this = this
            reader.onload = function (e) {
                var img = document.getElementById("test-picture");
                img.setAttribute('src', e.target.result);
                img.onload = function () {
                    _this.initCanvas(img);
                };
            }
            reader.readAsDataURL(inp.files[0]);
        }
    };
    initCanvas(img) {
        var cvs = document.getElementById("resultCanvas");
        cvs.width = img.width;
        cvs.height = img.height;
        this.setState({
            imageInfo: {
                width: img.width,
                height: img.height,
                context: cvs.getContext("2d")
            }
        });
        this.setState({
            mask: null
        })

        var tempCtx = document.createElement("canvas").getContext("2d");
        let imageInfo = this.state.imageInfo
        tempCtx.canvas.width = imageInfo.width;
        tempCtx.canvas.height = imageInfo.height;
        tempCtx.drawImage(img, 0, 0);
        imageInfo.data = tempCtx.getImageData(0, 0, imageInfo.width, imageInfo.height);
        this.setState({
            imageInfo
        })
    }
    getMousePosition(e) {
        var p = $(e.target).offset(),
            x = Math.round((e.clientX || e.pageX) - p.left),
            y = Math.round((e.clientY || e.pageY) - p.top);
        return { x: x, y: y };
    };
    onMouseDown(e) {
        if (e.button == 0) {
            this.setState({ allowDraw: true })
            let downPoint = this.getMousePosition(e)
            this.setState({ downPoint })
            this.drawMask(downPoint.x, downPoint.y);
        }
        else this.setState({ allowDraw: false })
    }
    onMouseMove(e) {
        if (this.state.allowDraw) {
            var p = this.getMousePosition(e);
            let downPoint = this.state.downPoint
            if (p.x != downPoint.x || p.y != downPoint.y) {
                var dx = p.x - downPoint.x,
                    dy = p.y - downPoint.y,
                    len = Math.sqrt(dx * dx + dy * dy),
                    adx = Math.abs(dx),
                    ady = Math.abs(dy),
                    sign = adx > ady ? dx / adx : dy / ady;
                sign = sign < 0 ? sign / 5 : sign / 3;
                var thres = Math.min(Math.max(this.state.colorThreshold + Math.floor(sign * len), 1), 255);
                //var thres = Math.min(colorThreshold + Math.floor(len / 3), 255);
                if (thres != this.state.currentThreshold) {
                    this.setState({
                        currentThreshold: thres
                    });
                    this.drawMask(downPoint.x, downPoint.y);
                }
            }
        }
    }
    onMouseUp(e) {
        this.setState({ allowDraw: false })
        this.setState({
            currentThreshold: this.state.colorThreshold
        })
    }
    showThreshold() {
        document.getElementById("threshold").innerHTML = "Threshold: " + this.state.currentThreshold;
    }
    drawMask(x, y) {
        let imageInfo = this.state.imageInfo
        if (!imageInfo) return;

        this.showThreshold();

        var image = {
            data: imageInfo.data.data,
            width: imageInfo.width,
            height: imageInfo.height,
            bytes: 4
        };

        let mask = MagicWand.floodFill(image, x, y, this.state.currentThreshold, null, true);
        mask = MagicWand.gaussBlurOnlyBorder(mask, blurRadius);
        this.setState({ mask })
        this.drawBorder();
    }
    hatchTick() {
        let hatchOffset = this.state.hatchOffset
        let hatchLength = this.state.hatchLength
        this.setState({ hatchOffset: (hatchOffset + 1) % (hatchLength * 2) })
        this.drawBorder(true);
    }
    drawBorder(noBorder) {
        let mask = this.state.mask
        let imageInfo = this.state.imageInfo
        if (!mask) return;

        var x, y, i, j, k,
            w = imageInfo.width,
            h = imageInfo.height,
            ctx = imageInfo.context,
            imgData = ctx.createImageData(w, h),
            res = imgData.data;
        let cacheInd
        if (!noBorder) cacheInd = MagicWand.getBorderIndices(mask);

        ctx.clearRect(0, 0, w, h);

        var len = cacheInd.length;
        for (j = 0; j < len; j++) {
            i = cacheInd[j];
            x = i % w; // calc x by index
            y = (i - x) / w; // calc y by index
            k = (y * w + x) * 4;
            if ((x + y + this.state.hatchOffset) % (this.state.hatchLength * 2) < this.state.hatchLength) { // detect hatch color 
                res[k + 3] = 255; // black, change only alpha
            } else {
                res[k] = 255; // white
                res[k + 1] = 255;
                res[k + 2] = 255;
                res[k + 3] = 255;
            }
        }

        ctx.putImageData(imgData, 0, 0);
    }
    trace() {
        var cs = MagicWand.traceContours(this.state.mask);
        cs = MagicWand.simplifyContours(cs, this.state.simplifyTolerant, this.state.simplifyCount);

        this.setState({
            mask: null
        })

        // draw contours
        let imageInfo = this.state.imageInfo
        var ctx = imageInfo.context;
        ctx.clearRect(0, 0, imageInfo.width, imageInfo.height);
        //inner
        ctx.beginPath();
        for (var i = 0; i < cs.length; i++) {
            if (!cs[i].inner) continue;
            var ps = cs[i].points;
            ctx.moveTo(ps[0].x, ps[0].y);
            for (var j = 1; j < ps.length; j++) {
                ctx.lineTo(ps[j].x, ps[j].y);
            }
        }
        ctx.strokeStyle = "red";
        ctx.stroke();
        //outer
        ctx.beginPath();
        for (var i = 0; i < cs.length; i++) {
            if (cs[i].inner) continue;
            var ps = cs[i].points;
            ctx.moveTo(ps[0].x, ps[0].y);
            for (var j = 1; j < ps.length; j++) {
                ctx.lineTo(ps[j].x, ps[j].y);
            }
        }
        ctx.strokeStyle = "blue";
        ctx.stroke();
    }
    paint(color, alpha) {
        const mask = this.state.mask
        const imageInfo = this.state.imageInfo
        if (!mask) return;

        var rgba = this.hexToRgb(color, alpha);

        var x, y,
            data = mask.data,
            bounds = mask.bounds,
            maskW = mask.width,
            w = imageInfo.width,
            h = imageInfo.height,
            ctx = imageInfo.context,
            imgData = ctx.createImageData(w, h),
            res = imgData.data;

        for (y = bounds.minY; y <= bounds.maxY; y++) {
            for (x = bounds.minX; x <= bounds.maxX; x++) {
                if (data[y * maskW + x] == 0) continue;
                let k = (y * w + x) * 4;
                res[k] = rgba[0];
                res[k + 1] = rgba[1];
                res[k + 2] = rgba[2];
                res[k + 3] = rgba[3];
            }
        }

        this.setState({ mask: null });

        ctx.putImageData(imgData, 0, 0);
    }
    hexToRgb(hex, alpha) {
        var int = parseInt(hex, 16);
        var r = (int >> 16) & 255;
        var g = (int >> 8) & 255;
        var b = int & 255;

        return [r, g, b, Math.round(alpha * 255)];
    }
    componentDidMount() {
        this.showThreshold()
        // document.getElementById("blurRadius").value = blurRadius;
        // setInterval(function () { hatchTick(); }, 300);
    }
    render() {
        return <>
            <div style={{ overflow: 'auto' }}>
                <div className={styles.button} onClick={this.uploadClick}>Upload image and click on it</div>
                <div className={styles.button} onClick={this.trace.bind(this)}>Create polygons by current selection</div>
                <div className={styles.button} onClick={() => this.paint('FF0000', 0.35)}>Paint the selection</div>
                <input id="file-upload" type="file" accept="image/*" onChange={this.imgChange.bind(this)} />
            </div>
            <div style={{ overflow: 'auto' }}>
                <div style={{ float: 'left', marginRight: '10px' }}>Blur radius: </div>
                <input id="blurRadius" value={this.state.blurRadius} type="text" onChange={this.onRadiusChange} style={{ float: 'left', width: '20px', marginRight: '10px' }} />
                <div id="threshold"></div>
            </div>
            <div>(hold left mouse button and move to change the color threshold)</div>
            <div className={styles.wrapper}>
                <div className={styles.content}>
                    <img id="test-picture" className={styles.picture} />
                    <canvas className={styles.canvas} id="resultCanvas" onMouseUp={this.onMouseUp.bind(this)} onMouseDown={this.onMouseDown.bind(this)} onMouseMove={this.onMouseMove.bind(this)}></canvas>
                </div>
            </div>
        </>
    }
}

export default MagicWandDemo
