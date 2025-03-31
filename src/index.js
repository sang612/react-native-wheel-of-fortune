import React, {Component} from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  Image,
} from 'react-native';
import * as d3Shape from 'd3-shape';

import Svg, {G, Text, TSpan, Path, Pattern} from 'react-native-svg';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

const {width, height} = Dimensions.get('screen');

class WheelOfFortune extends Component {
  constructor(props) {
    super(props);
    this.state = {
      enabled: false,
      started: false,
      finished: false,
      winner: null,
      isSpinning: false,
      gameScreen: new Animated.Value(width - 40),
      wheelOpacity: new Animated.Value(1),
      imageLeft: new Animated.Value(width / 2 - 30),
      imageTop: new Animated.Value(height / 2 - 70),
    };
    this.angle = 0;

    this.myRef = React.createRef();

    this.prepareWheel();
  }

  prepareWheel = () => {
    this.Rewards = this.props.options.rewards;
    this.RewardCount = this.Rewards.length;

    this.numberOfSegments = this.RewardCount;
    this.fontSize = 18;
    this.oneTurn = 360;
    this.angleBySegment = this.oneTurn / this.numberOfSegments;
    this.angleOffset = this.angleBySegment / 2;

    this.winner = this.props.options.winner
      ? this.props.options.winner
      : Math.floor(Math.random() * this.numberOfSegments);

    this._wheelPaths = this.makeWheel();
    this._angle = new Animated.Value(0);

    this.props.options.onRef(this);

  };

  resetWheelState = () => {
    this.setState({
      enabled: false,
      started: false,
      finished: false,
      winner: null,
      gameScreen: new Animated.Value(width - 40),
      wheelOpacity: new Animated.Value(1),
      imageLeft: new Animated.Value(width / 2 - 30),
      imageTop: new Animated.Value(height / 2 - 70),
    });
  };

  _tryAgain = () => {
    if (this.state.isSpinning) {
      return;
    }

    if (!this.myRef?.current) {
      this.myRef.current = true;
      this.prepareWheel();
      this.resetWheelState();
      this.angleListener();
      this._onPress();
    }
  };

  angleListener = () => {
    this._angle.addListener(event => {
      if (this.state.enabled) {
        this.setState({
          enabled: false,
          finished: false,
        });
      }

      this.angle = event.value;
    });
  };

  componentWillUnmount() {
    this.props.options.onRef(undefined);
  }

  componentDidMount() {
    this.angleListener();
  }

  makeWheel = () => {
    const data = Array.from({length: this.numberOfSegments}).fill(1);
    const arcs = d3Shape.pie()(data);
    var colors = this.props.options.colors
      ? this.props.options.colors
      : [
          '#87B0F7',
          '#F79A8A',
          '#89CD3E',
          '#F7DE91',
          '#22AFD3',
          '#5858D0',
          '#7B48C8',
          '#D843B9',
          '#E23B80',
          '#D82B2B',
        ];
    return arcs.map((arc, index) => {
      const instance = d3Shape
        .arc()
        .padAngle(0.01)
        .outerRadius(width / 2)
        .innerRadius(this.props.options.innerRadius || 100);
      return {
        path: instance(arc),
        color: colors[index % colors.length],
        value: this.Rewards[index],
        centroid: instance.centroid(arc),
      };
    });
  };

  _getWinnerIndex = () => {
    const deg = Math.abs(Math.round(this.angle % this.oneTurn));
    // wheel turning counterclockwise
    if (this.angle < 0) {
      return Math.floor(deg / this.angleBySegment);
    }
    // wheel turning clockwise
    return (
      (this.numberOfSegments - Math.floor(deg / this.angleBySegment)) %
      this.numberOfSegments
    );
  };

  _onPress = () => {
    if (this.state.isSpinning) {
      return;
    }
    const duration = this.props.options.duration || 10000;

    this.setState({
      started: true,
      isSpinning: true,
    });

    Animated.timing(this._angle, {
      toValue:
        365 -
        this.winner * (this.oneTurn / this.numberOfSegments) +
        360 * (duration / 1000),
      duration: duration,
      useNativeDriver: true,
    }).start(() => {
      this.myRef.current = false;
      const winnerIndex = this._getWinnerIndex();
      this.setState({
        finished: true,
        winner: this._wheelPaths[winnerIndex].value,
      });

      setTimeout(() => {
        this.setState({ isSpinning: false });
      }, 300);
      this.props.getWinner(this._wheelPaths[winnerIndex].value, winnerIndex);
    });
  };

  splitTextIntoLines(text, maxCharsPerLine) {
    const words = text.split(" "); // Tách theo khoảng trắng
    const lines = [];
    let currentLine = "";
  
    words.forEach((word) => {
      if ((currentLine + " " + word).trim().length > maxCharsPerLine) {
        lines.push(currentLine.trim()); // Đẩy dòng hiện tại vào mảng
        currentLine = word; // Bắt đầu dòng mới
      } else {
        currentLine += " " + word;
      }
    });
  
    if (currentLine) lines.push(currentLine.trim()); // Thêm dòng cuối cùng
  
    return lines;
  }

  _textRender = (x, y, text, i) => {
    const maxCharsPerLine = 8; // Giới hạn số ký tự mỗi dòng
    const lines = this.splitTextIntoLines(text, maxCharsPerLine);
  
    return (
      <Text
        x={x}
        y={y - (lines.length - 1) * this.fontSize * 0.6} // Căn chỉnh text giữa
        fill={this.props.options.textColor || '#fff'}
        textAnchor="middle"
        fontSize={this.fontSize}
        fontWeight={'bold'}
      >
        {lines.map((line, index) => (
          <TSpan
            x={x} // Giữ nguyên vị trí x để căn giữa
            dy={index === 0 ? 0 : this.fontSize * 1.2} // Xuống dòng
            key={`line-${i}-${index}`}
          >
            {line}
          </TSpan>
        ))}
      </Text>
    );
  };

  _renderSvgWheel = () => {
    return (
      <View style={styles.container}>
        {this._renderKnob()}
        <View style={{
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {this.props.options.playButton ? this._renderTopToPlay() : null}
          <Animated.View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              transform: [
                {
                  rotate: this._angle.interpolate({
                    inputRange: [-this.oneTurn, 0, this.oneTurn],
                    outputRange: [
                      `-${this.oneTurn}deg`,
                      `0deg`,
                      `${this.oneTurn}deg`,
                    ],
                  }),
                },
              ],
              backgroundColor: this.props.options.backgroundColor
                ? this.props.options.backgroundColor
                : '#fff',
              width: width - 20,
              height: width - 20,
              borderRadius: (width - 20) / 2,
              borderWidth: this.props.options.borderWidth
                ? this.props.options.borderWidth
                : 2,
              borderColor: this.props.options.borderColor
                ? this.props.options.borderColor
                : '#fff',
              opacity: this.state.wheelOpacity,
            }}>
            <AnimatedSvg
              width={this.state.gameScreen}
              height={this.state.gameScreen}
              viewBox={`0 0 ${width} ${width}`}
              style={{
                transform: [{ rotate: `-${this.angleOffset}deg` }],
                margin: 10,
              }}>
              <G y={width / 2} x={width / 2}>
                {this._wheelPaths.map((arc, i) => {
                  const [x, y] = arc.centroid;
                  const number = arc.value.toString();

                  return (
                    <G key={`arc-${i}`}>
                      <Path d={arc.path} strokeWidth={2} fill={arc.color} />
                      <G
                        rotation={
                          (i * this.oneTurn) / this.numberOfSegments +
                          this.angleOffset
                        }
                        origin={`${x}, ${y}`}>
                        {this._textRender(x, y, number, i)}
                      </G>
                    </G>
                  );
                })}
              </G>
            </AnimatedSvg>
          </Animated.View>
        </View>
      </View>
    );
  };

  _renderKnob = () => {
    const knobSize = this.props.options.knobSize
      ? this.props.options.knobSize
      : 20;
    // [0, this.numberOfSegments]
    const YOLO = Animated.modulo(
      Animated.divide(
        Animated.modulo(
          Animated.subtract(this._angle, this.angleOffset),
          this.oneTurn,
        ),
        new Animated.Value(this.angleBySegment),
      ),
      1,
    );

    return (
      <Animated.View
        style={{
          width: knobSize,
          height: knobSize * 2,
          justifyContent: 'flex-end',
          zIndex: 1,
          opacity: this.state.wheelOpacity,
          transform: [
            {
              rotate: YOLO.interpolate({
                inputRange: [-1, -0.5, -0.0001, 0.0001, 0.5, 1],
                outputRange: [
                  '0deg',
                  '0deg',
                  '35deg',
                  '-35deg',
                  '0deg',
                  '0deg',
                ],
              }),
            },
          ],
        }}>
        <Svg
          width={knobSize}
          height={(knobSize * 100) / 57}
          viewBox={`0 0 57 100`}
          style={{
            transform: [{translateY: 8}],
          }}>
          <Image
            source={
              this.props.options.knobSource
                ? this.props.options.knobSource
                : require('../assets/images/knob.png')
            }
            style={{ width: knobSize, height: (knobSize * 100) / 57 }}
          />
        </Svg>
      </Animated.View>
    );
  };

  _renderTopToPlay() {
      return (
        <View style={{position:'absolute'}}>
          {this.props.options.playButton()}
        </View>
      );
  }

  render() {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          disabled={this.props.options.disabled || this.state.isSpinning}
          onPress={()=>this._tryAgain()}
          style={{
            position: 'absolute',
            width: width,
            height: height / 2,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <Animated.View style={[styles.content, {padding: 10}]}>
            {this._renderSvgWheel()}
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  }
}

export default WheelOfFortune;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {},
  startText: {
    fontSize: 50,
    color: '#fff',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10,
  },
});