---
title: "Cording"
notebook: "InterStellar"
section_group: "1_Projects"
section: "Dashbaord"
onenote_id: "0-869dc72f8bb94f398ae00b059dee5024!1-733661839CC53BA5!7913"
level: 0
order: ""
created: "2017-09-11T10:17:58.835Z"
modified: "2017-09-11T10:17:58.835Z"
---

Cording

dApp 은 기본적으로 스마트 컨트랙트 + 사용자 인터페이스 입니다.

사용자 인터페이스를 만들기 위해서 HTML/CSS/Javascrip 사용

solidity&#160;

pragma solidity ^0.4.0;&#160;

&#160;

contract SimpleStorage {

&#160; &#160; uint storedData;

&#160;

&#160; &#160; function set(uint x) {

&#160; &#160; &#160; &#160; storedData = x;

&#160; &#160; }

&#160;

&#160; &#160; function get() constant returns (uint) {

&#160; &#160; &#160; &#160; return storedData;

&#160; &#160; }

}

출처: &lt;[http://www.chaintalk.io/archive/lecture/86](http://www.chaintalk.io/archive/lecture/86)&gt;

온라인 컴파일러 사용해 보겠습니다. 이름은 Remix 이고 사이트는

[https://ethereum.github.io/browser-solidity/](https://ethereum.github.io/browser-solidity/)&#160;

출처: &lt;[http://www.chaintalk.io/archive/lecture/86](http://www.chaintalk.io/archive/lecture/86)&gt;

Bytecode

606060405260438060106000396000f3606060405260e060020a600035046360fe47b1811460265780636d4ce63c146032575b6002565b34600257600435600055005b346002576000546060908152602090f3

Opcodes

PUSH1 0x60 PUSH1 0x40 MSTORE PUSH1 0x43 DUP1 PUSH1 0x10 PUSH1 0x0 CODECOPY PUSH1 0x0 RETURN PUSH1 0x60 PUSH1 0x40 MSTORE PUSH1 0xE0 PUSH1 0x2 EXP PUSH1 0x0 CALLDATALOAD DIV PUSH4 0x60FE47B1 DUP2 EQ PUSH1 0x26 JUMPI DUP1 PUSH4 0x6D4CE63C EQ PUSH1 0x32 JUMPI JUMPDEST PUSH1 0x2 JUMP JUMPDEST CALLVALUE PUSH1 0x2 JUMPI PUSH1 0x4 CALLDATALOAD PUSH1 0x0 SSTORE STOP JUMPDEST CALLVALUE PUSH1 0x2 JUMPI PUSH1 0x0 SLOAD PUSH1 0x60 SWAP1 DUP2 MSTORE PUSH1 0x20 SWAP1 RETURN

META MASK Account

kit desk unfair turkey nose album expand deny early high simple moral

0x5d6eed232c269bde242c966fa604bad2ac47e6dd
