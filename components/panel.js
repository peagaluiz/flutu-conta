import styled from 'styled-components/native';
import { RFPercentage } from "react-native-responsive-fontsize";

export const Panel = styled.View`
    flex: 1;
    width: 100%;
    borderRadius: 20px;
    padding: 20px;
    paddingTop: 10px;
    backgroundColor: ${props => props.color ? props.color : "#4B4B4B"};
    alignItems: center;
    justifyContent: center;
    borderColor: #2C2C2C;
    borderBottomWidth: 5px;
    borderRightWidth: 5px;
    borderLeftWidth: 5px;
`;
export const PanelTitle = styled.Text`
    fontSize: ${RFPercentage(2)}px;
    color: ${props => props.color ? props.color : '#6184FF'};
    alignSelf: ${props => props.align ? props.align : "flex-start"};
`;
export const PanelText = styled.Text`
    flexWrap: nowrap;
    fontSize: ${RFPercentage(2.5)}px;
    color: #fff;
    fontWeight: bold;
    alignSelf: flex-end;
    backgroundColor: #3d3d3d;
    paddingRight: 15px;
    paddingLeft: 15px;
    borderTopLeftRadius: 10px;
    borderTopRightRadius: 10px;
    width: 100%;
    textAlign: right;
`;
export const PanelSubText = styled.Text`
    fontSize: ${RFPercentage(1.5)}px;
    alignSelf: flex-end;
    color: #ccc;
    padding: 5px;
    paddingRight: 15px;
    paddingLeft: 15px;
    borderBottomLeftRadius: 10px;
    borderBottomRightRadius: 10px;
    backgroundColor: #3d3d3d;
    width: 100%;
    textAlign: right;
`;